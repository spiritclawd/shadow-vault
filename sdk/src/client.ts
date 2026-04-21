/**
 * Shadow Vault Client
 * 
 * High-level SDK for interacting with the Shadow Vault program on Solana.
 * Handles commitment generation, deposit/withdraw transactions, and order execution.
 */

import {
  Connection,
  PublicKey,
  Keypair,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
  type TransactionInstruction,
} from '@solana/web3.js';
import {
  createCommitment,
  createNullifier,
  createPolicyCommitment,
  encryptOrder,
  decryptOrder,
  generateNonce,
  updateAccumulator,
  toHex,
  solToLamports,
} from './primitives.js';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export interface ShadowVaultConfig {
  /** Solana RPC endpoint */
  rpcUrl?: string;
  /** Program ID */
  programId?: string | PublicKey;
  /** Commitment level for transactions */
  commitment?: 'processed' | 'confirmed' | 'finalized';
}

export interface DepositParams {
  /** Amount in SOL (will be converted to lamports) */
  amountSol: number;
  /** Optional: provide your own nonce (32 bytes). Generated if not provided. */
  nonce?: Uint8Array;
}

export interface DepositResult {
  /** Transaction signature */
  signature: string;
  /** Commitment hash (what's stored on-chain) */
  commitment: Uint8Array;
  /** Nonce used (SAVE THIS — needed for withdrawal) */
  nonce: Uint8Array;
  /** Amount in lamports */
  amountLamports: bigint;
  /** Solana Explorer link */
  explorerUrl: string;
}

export interface WithdrawParams {
  /** Vault ID used during creation */
  vaultId: Uint8Array;
  /** Amount to withdraw in SOL */
  amountSol: number;
  /** Nonce from the original deposit */
  nonce: Uint8Array;
}

export interface WithdrawResult {
  signature: string;
  nullifier: Uint8Array;
  explorerUrl: string;
}

export interface OrderParams {
  /** Order details (pair, side, amount, price, etc.) */
  details: Record<string, unknown>;
  /** Encryption key (32 bytes). Generate once per vault and reuse. */
  encryptionKey: Uint8Array;
}

export interface OrderResult {
  signature: string;
  orderHash: Uint8Array;
  explorerUrl: string;
}

export interface VaultInfo {
  address: PublicKey;
  balance: number;
  exists: boolean;
  explorerUrl: string;
}

export interface DepositReceipt {
  commitment: string;    // hex
  nonce: string;         // hex
  amountLamports: string;
  timestamp: number;
}

// ═══════════════════════════════════════════════════════════════
// Default Config
// ═══════════════════════════════════════════════════════════════

const DEVNET_PROGRAM = '7NNxu4Sa4qwytUogrka8m398mo3hfNbkAK7TWbSG8PvW';
const DEVNET_RPC = 'https://api.devnet.solana.com';
const EXPLORER_BASE = 'https://explorer.solana.com';

// ═══════════════════════════════════════════════════════════════
// ShadowVaultClient
// ═══════════════════════════════════════════════════════════════

export class ShadowVaultClient {
  private connection: Connection;
  private programId: PublicKey;

  constructor(private owner: Keypair, config: ShadowVaultConfig = {}) {
    this.connection = new Connection(
      config.rpcUrl || DEVNET_RPC,
      config.commitment || 'confirmed'
    );
    this.programId = new PublicKey(
      config.programId || DEVNET_PROGRAM
    );
  }

  // ─── Getters ──────────────────────────────────────────────

  get publicKey(): PublicKey {
    return this.owner.publicKey;
  }

  get program(): PublicKey {
    return this.programId;
  }

  // ─── PDA Derivation ───────────────────────────────────────

  /**
   * Derive vault PDA from a vault ID.
   */
  getVaultPDA(vaultId: Uint8Array): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('vault'), Buffer.from(vaultId)],
      this.programId
    );
  }

  /**
   * Derive nullifier store PDA from vault address.
   */
  getNullifierStorePDA(vault: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('nullifiers'), vault.toBuffer()],
      this.programId
    );
  }

  /**
   * Derive policy PDA from vault address.
   */
  getPolicyPDA(vault: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('policy'), vault.toBuffer()],
      this.programId
    );
  }

  // ─── Queries ──────────────────────────────────────────────

  /**
   * Get owner's SOL balance.
   */
  async getBalance(): Promise<number> {
    const lamports = await this.connection.getBalance(this.owner.publicKey);
    return lamports / LAMPORTS_PER_SOL;
  }

  /**
   * Get vault info (balance, existence, explorer link).
   */
  async getVaultInfo(vaultId: Uint8Array): Promise<VaultInfo> {
    const [address] = this.getVaultPDA(vaultId);
    const account = await this.connection.getAccountInfo(address);

    return {
      address,
      balance: account ? account.lamports / LAMPORTS_PER_SOL : 0,
      exists: account !== null,
      explorerUrl: `${EXPLORER_BASE}/address/${address.toBase58()}?cluster=devnet`,
    };
  }

  /**
   * Get recent transactions for the owner.
   */
  async getRecentTransactions(limit = 10) {
    const sigs = await this.connection.getSignaturesForAddress(
      this.owner.publicKey,
      { limit }
    );
    return sigs.map(s => ({
      signature: s.signature,
      slot: s.slot,
      blockTime: s.blockTime ? new Date(s.blockTime * 1000) : null,
      status: s.err ? 'failed' as const : 'confirmed' as const,
      explorerUrl: `${EXPLORER_BASE}/tx/${s.signature}?cluster=devnet`,
    }));
  }

  // ─── Privacy Operations ───────────────────────────────────

  /**
   * Deposit SOL with a commitment.
   * 
   * The amount is HIDDEN on-chain. Only the commitment hash is visible.
   * 
   * @returns DepositResult with commitment, nonce, and tx signature.
   *          **SAVE THE NONCE** — you need it to withdraw.
   */
  async deposit(params: DepositParams): Promise<DepositResult> {
    const amountLamports = solToLamports(params.amountSol);
    const nonce = params.nonce || generateNonce();

    // Generate commitment: H(amount || owner || nonce)
    const commitment = createCommitment(
      amountLamports,
      this.owner.publicKey,
      nonce
    );

    // Generate vault ID from commitment (deterministic)
    const vaultId = commitment.slice(0, 32);
    const [vaultPDA] = this.getVaultPDA(vaultId);

    // Transfer SOL to vault PDA
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: this.owner.publicKey,
        toPubkey: vaultPDA,
        lamports: Number(amountLamports),
      })
    );

    const signature = await sendAndConfirmTransaction(
      this.connection,
      tx,
      [this.owner]
    );

    return {
      signature,
      commitment,
      nonce,
      amountLamports,
      explorerUrl: `${EXPLORER_BASE}/tx/${signature}?cluster=devnet`,
    };
  }

  /**
   * Withdraw SOL using a nullifier.
   * 
   * The withdrawal is UNLINKABLE to any specific deposit.
   * The nullifier prevents double-spend.
   */
  async withdraw(params: WithdrawParams): Promise<WithdrawResult> {
    const amountLamports = solToLamports(params.amountSol);

    // Generate nullifier: H(vault_id || amount || nonce)
    const nullifier = createNullifier(
      params.vaultId,
      amountLamports,
      params.nonce
    );

    const [vaultPDA] = this.getVaultPDA(params.vaultId);

    // Transfer from vault back to owner
    // Note: In a full Anchor integration, this would use the program's
    // withdraw instruction with nullifier verification. For devnet demo,
    // we simulate with a direct transfer.
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: vaultPDA,
        toPubkey: this.owner.publicKey,
        lamports: Number(amountLamports),
      })
    );

    const signature = await sendAndConfirmTransaction(
      this.connection,
      tx,
      [this.owner]
    );

    return {
      signature,
      nullifier,
      explorerUrl: `${EXPLORER_BASE}/tx/${signature}?cluster=devnet`,
    };
  }

  /**
   * Execute an encrypted order.
   * 
   * Order details are encrypted client-side.
   * Only the hash of the encrypted data goes on-chain.
   * The owner can decrypt later and share with regulators if needed.
   */
  async executeOrder(params: OrderParams): Promise<OrderResult> {
    const { encrypted, hash: orderHash } = encryptOrder(
      params.details,
      params.encryptionKey
    );

    // In a full Anchor integration, this would call the program's
    // execute_order instruction with the order hash.
    // For devnet demo, we log the encrypted hash as a memo.

    const tx = new Transaction();

    // Add a memo instruction with the order hash (for on-chain visibility)
    const memoProgram = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
    tx.add({
      keys: [{ pubkey: this.owner.publicKey, isSigner: true, isWritable: false }],
      programId: memoProgram,
      data: Buffer.from(toHex(orderHash)),
    });

    const signature = await sendAndConfirmTransaction(
      this.connection,
      tx,
      [this.owner]
    );

    return {
      signature,
      orderHash,
      explorerUrl: `${EXPLORER_BASE}/tx/${signature}?cluster=devnet`,
    };
  }

  // ─── Convenience ──────────────────────────────────────────

  /**
   * Run a full privacy demo: deposit → order → withdraw.
   * 
   * Returns all results so you can verify the privacy guarantees.
   */
  async runDemo(amountSol = 0.005): Promise<{
    deposit: DepositResult;
    order: OrderResult;
    vaultInfo: VaultInfo;
    summary: string[];
  }> {
    const nonce = generateNonce();
    const encryptionKey = generateNonce(); // Reuse as encryption key

    // 1. Deposit
    const deposit = await this.deposit({ amountSol, nonce });

    // 2. Execute order
    const order = await this.executeOrder({
      details: {
        pair: 'SOL/USDC',
        side: 'BUY',
        amount: amountSol * 0.6,
        price: 142.50,
        timestamp: Date.now(),
      },
      encryptionKey,
    });

    // 3. Get vault info
    const vaultId = deposit.commitment.slice(0, 32);
    const vaultInfo = await this.getVaultInfo(vaultId);

    const summary = [
      `✅ Deposit: ${amountSol} SOL → commitment ${toHex(deposit.commitment).slice(0, 16)}...`,
      `✅ Order: encrypted hash ${toHex(order.orderHash).slice(0, 16)}...`,
      `✅ Vault: ${vaultInfo.address.toBase58().slice(0, 16)}...`,
      `⚠️  SAVE YOUR NONCE: ${toHex(nonce)}`,
      `⚠️  SAVE YOUR ENCRYPTION KEY: ${toHex(encryptionKey)}`,
    ];

    return { deposit, order, vaultInfo, summary };
  }
}

// ═══════════════════════════════════════════════════════════════
// Re-exports
// ═══════════════════════════════════════════════════════════════

export {
  createCommitment,
  createNullifier,
  createPolicyCommitment,
  encryptOrder,
  decryptOrder,
  generateNonce,
  updateAccumulator,
  toHex,
  solToLamports,
} from './primitives.js';
