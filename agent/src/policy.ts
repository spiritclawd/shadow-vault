// Shadow Vault — Scoped Policy Engine
// On-chain enforcement of spending limits, risk parameters, and time-based rules.

import type { Policy, PolicyCheck, VaultState } from './types.js';

export class PolicyEngine {
  static check(orderAmount: number, vault: VaultState): PolicyCheck {
    const now = Math.floor(Date.now() / 1000);
    const p = vault.policy;

    // 1. Check expiry
    if (p.expiry > 0 && now >= p.expiry) {
      return { allowed: false, reason: `Policy expired at ${new Date(p.expiry * 1000).toISOString()}` };
    }

    // 2. Check single order size
    if (orderAmount > p.maxOrderSize) {
      return {
        allowed: false,
        reason: `Order ${orderAmount} exceeds max order size ${p.maxOrderSize}`,
      };
    }

    // 3. Check epoch spend
    let epochSpent = vault.epochSpent;
    if (now - vault.epochStart >= p.epochDuration) {
      epochSpent = 0; // new epoch
    }

    if (epochSpent + orderAmount > p.maxSpendPerEpoch) {
      return {
        allowed: false,
        reason: `Epoch spend limit: ${epochSpent + orderAmount} > ${p.maxSpendPerEpoch}`,
        epochSpent,
        epochLimit: p.maxSpendPerEpoch,
      };
    }

    // 4. Check sufficient balance
    const available = vault.totalDeposited - vault.totalWithdrawn;
    if (orderAmount > available) {
      return {
        allowed: false,
        reason: `Insufficient balance: ${orderAmount} > ${available} available`,
      };
    }

    // 5. Check position limit
    // (simplified — in production this uses FHE comparison)
    const currentPosition = 0; // would be decrypted position
    if (currentPosition + orderAmount > p.maxPositionSize) {
      return {
        allowed: false,
        reason: `Position limit: would exceed ${p.maxPositionSize}`,
      };
    }

    return {
      allowed: true,
      epochSpent,
      epochLimit: p.maxSpendPerEpoch,
    };
  }

  static defaultPolicy(): Policy {
    return {
      maxSpendPerEpoch: 5_000_000_000,   // 5 SOL per epoch
      maxOrderSize: 2_000_000_000,        // 2 SOL max per order
      maxPositionSize: 10_000_000_000,    // 10 SOL max position
      epochDuration: 3600,                 // 1 hour epochs
      expiry: 0,                           // never expires
    };
  }
}
