# Shadow Vault

![Solana](https://img.shields.io/badge/Solana-Devnet-9945FF)
![Anchor](https://img.shields.io/badge/Anchor-1.0.0-blue)
![SDK](https://img.shields.io/badge/SDK-v0.2.0-green)

**Private limit orders on Solana — trade with intent, not visibility.**

---

## The Problem

Every limit order on Solana is a public signal. When a large trader places a buy at $42, every MEV bot and front-runner sees it and acts before execution. On-chain order books leak strategy by design, costing traders billions annually in slippage and adverse execution. Existing privacy solutions either require trusted hardware or are too slow for real-time trading.

## What We Built

Shadow Vault is an on-chain vault system that separates order *intents* from order *details*. Users deposit funds into vaults with SHA-256 commitment schemes — the commitment hides the order parameters (amount, direction, price target) while the on-chain program enforces execution rules trustlessly. Nullifiers prevent double-spending without revealing which vault is being consumed.

**What's on-chain today:** Commitment-based vaults, deposit/withdraw flow, order execution with nullifier verification, and a TypeScript SDK for building private trading agents.

**What's NOT on-chain yet:** FHE-based encrypted order matching, full MEV resistance, cross-protocol private routing.

## Live Links

| Resource | Link |
|----------|------|
| **Landing Page** | [https://spiritclawd.github.io/shadow-vault/](https://spiritclawd.github.io/shadow-vault/) |
| **Solana Explorer** | [Devnet Program](https://explorer.solana.com/address/7NNxu4Sa4qwytUogrka8m398mo3hfNbkAK7TWbSG8PvW?cluster=devnet) |
| **NPM SDK** | `@shadow-vault/solana@0.2.0` |

## Quick Start

```bash
npm install @shadow-vault/solana
```

```typescript
import { ShadowVault } from '@shadow-vault/solana';

const vault = new ShadowVault({ cluster: 'devnet' });
const { commitment, vaultPDA } = await vault.createVault(wallet, 1_000_000);
const sig = await vault.executeOrder(wallet, vaultPDA, commitment);
```

## Architecture

```
┌─────────────┐      commitment       ┌─────────────────────┐
│  Trader /   │ ──────────────────────▶│  Shadow Vault       │
│  AI Agent   │                        │  Program (Solana)   │
│  (SDK)      │◀────────────────────── │                     │
└─────────────┘   execution receipt    │  4 Instructions:    │
                                       │  • create_vault     │
                                       │  • deposit          │
                                       │  • execute_order    │
                                       │  • withdraw         │
                                       └─────────────────────┘
                                       
  Commitment:  H(amount ‖ owner ‖ nonce)
  Nullifier:   H(vault_id ‖ amount ‖ nonce)
  
  Program ID:  7NNxu4Sa4qwytUogrka8m398mo3hfNbkAK7TWbSG8PvW
```

## Privacy: Implemented vs Roadmap

| Feature | Status | Details |
|---------|--------|---------|
| SHA-256 commitment schemes | ✅ Implemented | Order params hidden behind H(amount \|\| owner \|\| nonce) |
| Nullifier-based double-spend prevention | ✅ Implemented | H(vault_id \|\| amount \|\| nonce) |
| Deposit privacy (amount hidden) | ✅ Implemented | Amount committed, not stored |
| Execution without revealing intent | ✅ Implemented | Executor consumes nullifier, not vault contents |
| Encrypted order matching (FHE) | 🔜 Roadmap | Full homomorphic encryption for matching engine |
| MEV-resistant routing | 🔜 Roadmap | Private transaction submission via Jito bundles |
| Cross-protocol private swaps | 🔜 Roadmap | Integration with DEX aggregators |
| ZK proof of order validity | 🔜 Roadmap | Circuits for proving constraints without revealing inputs |

## Competitive Position

Shadow Vault is the only Solana privacy trading project purpose-built for AI agents — where automated strategies are most vulnerable to front-running and most in need of intent privacy.

| Project | Focus | Privacy Method | Agent-First |
|---------|-------|----------------|-------------|
| **Shadow Vault** | Private limit orders | Commitments + nullifiers | ✅ |
| Shadow Book | Dark pool | TEE-based | ❌ |
| LatticA | FHE trading | FHE (early stage) | ❌ |
| Encifher | Encrypted orders | FHE (alpha) | ❌ |

## Prize Tracks

| Track | Prize | Eligibility | Why We Qualify |
|-------|-------|-------------|----------------|
| **Encrypt** | $15,000 | Privacy-preserving on-chain app | SHA-256 commitments hide order params on Solana |
| **Privacy** | $5,000 | Best privacy-focused project | Nullifier scheme prevents linking deposits to withdrawals |
| **Umbra** | $10,000 | Private trading / DeFi privacy | Core use case is private limit order execution |
| **Grand Prize** | $30,000 | Overall hackathon winner | Working SDK, deployed program, clear roadmap |

## Project Structure

```
shadow-vault/
├── programs/
│   └── shadow-vault/          # Anchor program (Solana, 282KB binary)
│       └── src/lib.rs          # 4 instructions: create_vault, deposit, execute_order, withdraw
├── sdk/
│   └── shadow-vault-solana/   # TypeScript SDK (@shadow-vault/solana v0.2.0)
│       └── src/index.ts        # ShadowVault class, commitment + nullifier utils
├── landing/                    # Landing page (GitHub Pages)
├── tests/                      # Anchor integration tests
├── Anchor.toml                 # Program ID: 7NNxu4Sa4qwytUogrka8m398mo3hfNbkAK7TWbSG8PvW
└── README.md                   # You are here
```

---

*Built for Colosseum Hackathon — Solana Devnet*