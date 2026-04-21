// Shadow Vault — Agent Core
// The main agent class that manages encrypted vaults and executes strategies.

import { EventEmitter } from 'events';
import { encrypt, decrypt, fheAdd, fheCompare, generatePubkey, generateTxSignature } from './encrypt-sim.js';
import { PolicyEngine } from './policy.js';
import type { VaultState, Ciphertext, Policy, OrderEvent, AuditEntry } from './types.js';

export class ShadowVaultAgent extends EventEmitter {
  private vaults: Map<string, VaultState> = new Map();
  private auditLogs: Map<string, AuditEntry[]> = new Map();
  private vaultCounter = 0;

  constructor(private agentPubkey: string) {
    super();
  }

  createVault(
    name: string,
    owner: string,
    policy?: Partial<Policy>
  ): VaultState {
    const id = `vault_${++this.vaultCounter}_${Date.now()}`;
    const fullPolicy = { ...PolicyEngine.defaultPolicy(), ...policy };
    const now = Math.floor(Date.now() / 1000);

    const vault: VaultState = {
      id,
      owner,
      agent: this.agentPubkey,
      balance: encrypt(0),
      position: encrypt(0),
      totalDeposited: 0,
      totalWithdrawn: 0,
      orderCount: 0,
      isActive: true,
      createdAt: now,
      policy: fullPolicy,
      epochSpent: 0,
      epochStart: now,
    };

    this.vaults.set(id, vault);
    this.auditLogs.set(id, []);

    this.emit('event', {
      type: 'vault_created',
      timestamp: now,
      vault: id,
      data: { name, owner, policy: fullPolicy },
    } as OrderEvent);

    return vault;
  }

  deposit(vaultId: string, amount: number, owner: string): { success: boolean; txSignature?: string; error?: string } {
    const vault = this.vaults.get(vaultId);
    if (!vault) return { success: false, error: 'Vault not found' };
    if (!vault.isActive) return { success: false, error: 'Vault inactive' };
    if (vault.owner !== owner) return { success: false, error: 'Unauthorized' };

    // Update encrypted balance using FHE addition
    const amountCt = encrypt(amount);
    vault.balance = fheAdd(vault.balance, amountCt);
    vault.totalDeposited += amount;

    const txSig = generateTxSignature();
    const now = Math.floor(Date.now() / 1000);

    this.addAuditEntry(vaultId, {
      index: vault.orderCount++,
      timestamp: now,
      action: 'deposit',
      amount,
      encrypted: true,
      policyCheck: { allowed: true },
      txSignature: txSig,
    });

    this.emit('event', {
      type: 'deposited',
      timestamp: now,
      vault: vaultId,
      data: { amount, totalDeposited: vault.totalDeposited, txSignature: txSig },
    } as OrderEvent);

    return { success: true, txSignature: txSig };
  }

  executeOrder(
    vaultId: string,
    amount: number,
    market: string = 'SOL/USDC'
  ): { success: boolean; txSignature?: string; error?: string; policyCheck: any } {
    const vault = this.vaults.get(vaultId);
    if (!vault) return { success: false, error: 'Vault not found', policyCheck: { allowed: false } };

    // Step 1: Policy check (on-chain enforcement)
    const policyCheck = PolicyEngine.check(amount, vault);
    if (!policyCheck.allowed) {
      const now = Math.floor(Date.now() / 1000);
      this.addAuditEntry(vaultId, {
        index: vault.orderCount++,
        timestamp: now,
        action: 'order_rejected',
        amount,
        market,
        encrypted: false,
        policyCheck,
      });

      this.emit('event', {
        type: 'order_rejected',
        timestamp: now,
        vault: vaultId,
        data: { amount, market, reason: policyCheck.reason },
      } as OrderEvent);

      return { success: false, error: policyCheck.reason, policyCheck };
    }

    // Step 2: Encrypt the order (FHE)
    const orderCt = encrypt(amount);

    // Step 3: Execute through FHE computation graph
    // In production: encrypt_ctx.execute_order_graph(balance_ct, amount_ct, price_ct, ...)
    const hasFunds = fheCompare(vault.balance, orderCt);
    if (!hasFunds) {
      return { success: false, error: 'Insufficient encrypted balance', policyCheck };
    }

    // FHE computation: balance = balance - amount, position = position + amount
    // In production, Encrypt's execute_order_graph handles this atomically
    // For simulation, we use FHE add/subtract operations
    const newBalance = decrypt(vault.balance) - amount;
    const newPosition = decrypt(vault.position) + amount;
    vault.balance = encrypt(Math.max(0, newBalance));
    vault.position = encrypt(newPosition);

    // Update epoch tracking
    const now = Math.floor(Date.now() / 1000);
    if (now - vault.epochStart >= vault.policy.epochDuration) {
      vault.epochSpent = 0;
      vault.epochStart = now;
    }
    vault.epochSpent += amount;

    const txSig = generateTxSignature();

    this.addAuditEntry(vaultId, {
      index: vault.orderCount++,
      timestamp: now,
      action: 'order_executed',
      amount,
      market,
      encrypted: true,
      policyCheck,
      txSignature: txSig,
    });

    this.emit('event', {
      type: 'order_executed',
      timestamp: now,
      vault: vaultId,
      data: { amount, market, orderCiphertext: orderCt.hex.slice(0, 16) + '...', txSignature: txSig },
    } as OrderEvent);

    return { success: true, txSignature: txSig, policyCheck };
  }

  getVaultState(vaultId: string): VaultState | undefined {
    return this.vaults.get(vaultId);
  }

  getAuditLog(vaultId: string): AuditEntry[] {
    return this.auditLogs.get(vaultId) || [];
  }

  // Owner-only: decrypt vault balance
  decryptBalance(vaultId: string): number {
    const vault = this.vaults.get(vaultId);
    if (!vault) throw new Error('Vault not found');
    return decrypt(vault.balance);
  }

  decryptPosition(vaultId: string): number {
    const vault = this.vaults.get(vaultId);
    if (!vault) throw new Error('Vault not found');
    return decrypt(vault.position);
  }

  getAllVaults(): VaultState[] {
    return Array.from(this.vaults.values());
  }

  private addAuditEntry(vaultId: string, entry: AuditEntry) {
    const log = this.auditLogs.get(vaultId) || [];
    log.push(entry);
    this.auditLogs.set(vaultId, log);
  }
}
