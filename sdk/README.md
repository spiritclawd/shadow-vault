# @shadow-vault/solana

![Built for Colosseum Encrypt Hackathon 2026](https://img.shields.io/badge/Built%20for-Colosseum%20Encrypt%20Hackathon%202026-purple)
![Version](https://img.shields.io/badge/version-0.2.0-blue)
![Network](https://img.shields.io/badge/network-Solana%20Devnet-green)

Privacy-preserving vault SDK for AI agents on Solana.

**Your strategies stay yours.** Deposits, withdrawals, and orders are hidden behind cryptographic commitments and nullifiers.

[GitHub](https://github.com/spiritclawd/shadow-vault) · [Explorer](https://explorer.solana.com/address/7NNxu4Sa4qwytUogrka8m398mo3hfNbkAK7TWbSG8PvW?cluster=devnet)

---

## Installation

```bash
npm install @shadow-vault/solana
```

Requires `@solana/web3.js` (auto-installed as peer dependency).

## Quick Start

```typescript
import { ShadowVaultClient, generateNonce } from '@shadow-vault/solana';
import { Keypair } from '@solana/web3.js';

// Load your keypair
const owner = Keypair.fromSecretKey(/* your secret key bytes */);

// Connect to the vault (devnet by default)
const vault = new ShadowVaultClient(owner);

// Deposit SOL — amount is HIDDEN on-chain
const dep = await vault.deposit({ amountSol: 0.1 });
// On-chain you see: commitment hash 0x8f3a...
// You DON'T see: 0.1 SOL

// Execute an encrypted order
await vault.executeOrder({
  details: { pair: 'SOL/USDC', side: 'BUY', amount: 0.05 },
  encryptionKey: generateNonce(),
});
// On-chain you see: hash 0xe70d...
// You DON'T see: pair, side, amount, or price

// Withdraw with nullifier — unlinkable to deposit
const vaultId = dep.commitment.slice(0, 32);
await vault.withdraw({ vaultId, amountSol: 0.1, nonce: dep.nonce });
// On-chain you see: nullifier 0x8488...
// You DON'T see: which deposit this came from
```

## API Reference

### `new ShadowVaultClient(owner, config?)`

Creates a connected client instance.

| Parameter | Type | Description |
|-----------|------|-------------|
| `owner` | `Keypair` | Solana keypair of the vault owner |
| `config.rpcUrl?` | `string` | RPC endpoint (default: devnet) |
| `config.programId?` | `string` | On-chain program address |
| `config.commitment?` | `string` | Transaction commitment level |

```typescript
const vault = new ShadowVaultClient(owner, {
  rpcUrl: 'https://api.devnet.solana.com',  // default
  programId: '7NNxu4Sa4qwytUogrka8m398mo3hfNbkAK7TWbSG8PvW', // default
  commitment: 'confirmed',                   // default
});
```

### `vault.deposit(params) → DepositResult`

Deposit SOL with a hidden amount. Only the commitment hash is stored on-chain.

| Parameter | Type | Description |
|-----------|------|-------------|
| `amountSol` | `number` | Amount in SOL |
| `nonce?` | `Uint8Array` | Custom nonce (auto-generated if omitted) |

**Returns:**

```typescript
{
  commitment: string;      // Save this — needed for withdrawal
  nonce: Uint8Array;       // CRITICAL: save for withdrawal
  signature: string;       // Transaction signature
  explorerUrl: string;     // Solana Explorer link
}
```

### `vault.executeOrder(params) → OrderResult`

Execute a privacy-preserving order. Details are encrypted client-side; only the hash is stored on-chain.

| Parameter | Type | Description |
|-----------|------|-------------|
| `details` | `object` | Order details: `{ pair, side, amount, price }` |
| `encryptionKey` | `Uint8Array` | Key to encrypt order (save for decryption) |

### `vault.withdraw(params) → WithdrawResult`

Withdraw using a nullifier — cryptographically unlinkable to the original deposit.

| Parameter | Type | Description |
|-----------|------|-------------|
| `vaultId` | `string` | First 32 chars of deposit commitment |
| `amountSol` | `number` | Amount to withdraw |
| `nonce` | `Uint8Array` | Nonce from the deposit (required) |

### `vault.getVaultInfo(vaultId) → VaultInfo`

Retrieve vault balance and status.

### `vault.getBalance() → number`

Get the owner's SOL balance.

### `vault.runDemo(amountSol?)`

Run a full deposit → order → verify flow (for testing).

---

## How Privacy Works

Shadow Vault uses three cryptographic primitives to hide your activity on-chain:

### 1. Commitment Scheme (Deposits)

```
commitment = SHA-256(amount || owner || nonce)
```

The deposit amount never appears on-chain — only a hash. You keep the nonce secret to prove ownership later.

### 2. Nullifier Scheme (Withdrawals)

```
nullifier = SHA-256(vault_id || amount || nonce)
```

When you withdraw, a unique nullifier is published. It proves you deposited without revealing *which* deposit. The nullifier is stored on-chain to prevent double-spend.

### 3. Encrypted Orders

```
order_hash = SHA-256(encrypt(details, key))
```

Order details (pair, side, amount, price) are encrypted client-side. Only the hash is stored on-chain. The owner holds the decryption key and can share it with regulators if needed.

### What's Visible vs. Hidden

| Data | On-Chain | Hidden? |
|------|----------|---------|
| Deposit amount | Commitment hash | ✅ Yes |
| Withdrawal amount | Nullifier hash | ✅ Yes |
| Order details | Encrypted hash | ✅ Yes |
| Policy limits | Commitment hashes | ✅ Yes |
| SOL balance | PDA balance | ⚠️ Visible (native SOL) |

---

## Privacy Primitives

All primitives are available standalone — use them without the client if you prefer:

```typescript
import {
  createCommitment,
  createNullifier,
  createPolicyCommitment,
  encryptOrder,
  decryptOrder,
  generateNonce,
  updateAccumulator,
  sha256,
  toHex,
  fromHex,
  lamportsToSol,
  solToLamports,
  PROGRAM_ID,
  DEVNET_RPC,
  VERSION,
} from '@shadow-vault/solana';
```

---

## On-Chain Verification

| | |
|---|---|
| **Program ID** | `7NNxu4Sa4qwytUogrka8m398mo3hfNbkAK7TWbSG8PvW` |
| **Network** | Solana Devnet |
| **Explorer** | [View on Solana Explorer](https://explorer.solana.com/address/7NNxu4Sa4qwytUogrka8m398mo3hfNbkAK7TWbSG8PvW?cluster=devnet) |

---

## Status & Roadmap

### ✅ Implemented (v0.2.0)

- Commitment-based deposits (hidden amounts)
- Nullifier-based withdrawals (unlinkable)
- Encrypted order execution
- SHA-256 commitment primitives
- Full TypeScript types
- Devnet deployment with passing tests

### 🔜 Roadmap

- SPL token support
- Multi-sig owner
- ZK proofs for policy compliance
- FHE integration (Inco Network)
- Multi-chain (Ethereum, Base, Arbitrum)

---

## Links

- **GitHub:** [github.com/spiritclawd/shadow-vault](https://github.com/spiritclawd/shadow-vault)
- **Explorer:** [Solana Explorer (devnet)](https://explorer.solana.com/address/7NNxu4Sa4qwytUogrka8m398mo3hfNbkAK7TWbSG8PvW?cluster=devnet)

---

## License

MIT

---

![Built for Colosseum Encrypt Hackathon 2026](https://img.shields.io/badge/Built%20for-Colosseum%20Encrypt%20Hackathon%202026-purple)
