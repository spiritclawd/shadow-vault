# @shadow-vault/solana

Privacy-preserving vault SDK for AI agents on Solana.

**Your strategies stay yours.** Deposits, withdrawals, and orders are hidden behind cryptographic commitments and nullifiers.

## Install

```bash
npm install @shadow-vault/solana
```

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

## How It Works

### Commitment Scheme (Deposits)

```
commitment = H(amount || owner || nonce)
```

- Client generates a random nonce
- Computes SHA-256 hash of `amount + owner + nonce`
- Only the hash goes on-chain — amount is hidden

### Nullifier Scheme (Withdrawals)

```
nullifier = H(vault_id || amount || nonce)
```

- Proves you deposited without revealing which deposit
- Prevents double-spend (nullifier stored on-chain)
- Unlinkable to the original commitment

### Encrypted Orders

```
order_hash = H(encrypt(details, key))
```

- Order details encrypted client-side
- Only the hash stored on-chain
- Owner can decrypt and share with regulators if needed

## API

### `new ShadowVaultClient(owner, config?)`

Create a client instance.

```typescript
const vault = new ShadowVaultClient(owner, {
  rpcUrl: 'https://api.devnet.solana.com',  // default
  programId: '7NNxu4...',                    // default: deployed program
  commitment: 'confirmed',                   // default
});
```

### `vault.deposit(params)`

Deposit SOL with a hidden amount.

```typescript
const result = await vault.deposit({
  amountSol: 0.1,           // Amount in SOL
  nonce: generateNonce(),   // Optional: custom nonce
});

// result.commitment  — save this
// result.nonce       — CRITICAL: save for withdrawal
// result.signature   — tx signature
// result.explorerUrl — Solana Explorer link
```

### `vault.withdraw(params)`

Withdraw using a nullifier (unlinkable to deposit).

```typescript
await vault.withdraw({
  vaultId: commitment.slice(0, 32),  // From deposit
  amountSol: 0.1,
  nonce: dep.nonce,                   // From deposit — REQUIRED
});
```

### `vault.executeOrder(params)`

Execute an encrypted order.

```typescript
await vault.executeOrder({
  details: { pair: 'SOL/USDC', side: 'BUY', amount: 0.05, price: 142.50 },
  encryptionKey: generateNonce(),  // Save for decryption
});
```

### `vault.getVaultInfo(vaultId)`

Get vault balance and status.

### `vault.getBalance()`

Get owner's SOL balance.

### `vault.runDemo(amountSol?)`

Run a full deposit → order flow (for testing).

## Privacy Primitives

All primitives work independently — use them without the client if you want.

```typescript
import {
  createCommitment,
  createNullifier,
  createPolicyCommitment,
  encryptOrder,
  decryptOrder,
  generateNonce,
  toHex,
} from '@shadow-vault/solana';
```

## On-Chain Verification

- **Program:** `7NNxu4Sa4qwytUogrka8m398mo3hfNbkAK7TWbSG8PvW`
- **Network:** Solana Devnet
- **Explorer:** [View on Solana Explorer](https://explorer.solana.com/address/7NNxu4Sa4qwytUogrka8m398mo3hfNbkAK7TWbSG8PvW?cluster=devnet)

## What's Private

| Data | On-Chain | Hidden? |
|------|----------|---------|
| Deposit amount | Commitment hash | ✅ Yes |
| Withdrawal amount | Nullifier hash | ✅ Yes |
| Order details | Encrypted hash | ✅ Yes |
| Policy limits | Commitment hashes | ✅ Yes |
| SOL balance | PDA balance | ⚠️ Visible (native SOL) |

## Roadmap

- ✅ v0.2: Commitments, nullifiers, encrypted orders
- 🔜 SPL token support
- 🔜 Multi-sig owner
- 🔜 ZK proofs for policy compliance
- 🔜 FHE integration (Inco Network)
- 🔜 Multi-chain (Ethereum, Base, Arbitrum)

## License

MIT
