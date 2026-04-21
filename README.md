# Shadow Vault

**Encrypted AI Agent Strategy Vault on Solana**

> Colosseum Breakout Hackathon 2026 — $65K+ Prize Ceiling

## The Problem

AI agents managing DeFi strategies are a black box. Their positions, balances, and trade logic are visible on-chain — making them vulnerable to front-running, strategy theft, and privacy leaks. Every alpha-generating strategy is a public billboard.

## Our Solution

Shadow Vault uses **Fully Homomorphic Encryption (FHE)** to keep AI agent strategies completely private. Balances, positions, trade logic — all encrypted on-chain, verifiable but unreadable.

## Live Demo

🌐 **Public UI:** https://spiritclawd.github.io/shadow-vault/

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Shadow Vault                            │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Solana     │  │    Agent     │  │     UI       │      │
│  │   Program    │  │  (TypeScript)│  │   (React)    │      │
│  │              │  │              │  │              │      │
│  │ • Vault      │  │ • Zerion CLI │  │ • Dark theme │      │
│  │ • Policy     │  │ • Policies   │  │ • Interactive│      │
│  │ • Audit      │  │ • FHE Sim    │  │ • Real-time  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              FHE Layer (Encrypt SDK)                  │   │
│  │  Encrypted balances → Encrypted orders → Audit log   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Program (`program/`) — 592 lines Rust

Solana/Anchor smart contract with:
- **Vault Management** — Create vaults with encrypted balances, deposit/withdraw SOL
- **Policy Engine** — Max order size, epoch spend limits, expiry, allowed tokens
- **Audit Trail** — All actions logged with encrypted data, owner-only decryption
- **Agent Authorization** — Only authorized agents can execute orders

Built with `anchor-lang 1.0.0` + `solana-invoke 0.5`. Compiles to 208KB `.so` binary.

### Agent (`agent/`) — 648 lines TypeScript

AI agent that:
- Creates encrypted vaults and manages deposits
- Executes trades with policy enforcement
- Integrates with Zerion CLI for portfolio data
- Simulates FHE encryption for demo purposes

### UI (`ui/`) — 686 lines React/CSS

Interactive dark-themed demo showing:
- Vault creation with encrypted balances
- Deposit flow (10 SOL → encrypted)
- Agent trade execution (3 encrypted orders)
- Policy rejection (order exceeds 2 SOL max)
- Audit log (encrypted vs plaintext)
- Owner decryption view

## Prize Tracks

| Track | Sponsor | Prize | How We Qualify |
|-------|---------|-------|----------------|
| **Encrypt** | Encrypted Capital Markets | $15,000 | FHE for on-chain encrypted vault data |
| **Umbra** | Privacy Infrastructure | $10,000 | Private agent strategies |
| **Zerion** | Portfolio Intelligence | $7,000 | Zerion CLI integration for portfolio data |
| **Torque** | Agent Orchestration | $3,000 | MCP agent framework |
| **Grand Prize** | Colosseum | $30,000 | Full-stack encrypted agent vault |

**Total Ceiling: $65,000+**

## Building

### Program (in GitHub Codespace)
```bash
cd program
cargo build-sbf
# Output: target/deploy/shadow_vault.so (208KB)
```

### Agent Demo
```bash
cd agent
npm install
npm run demo
```

### UI
```bash
cd ui
npm install
npm run dev
# → http://localhost:8082
```

## Key Compilation Notes

The program was compiled in a **GitHub Codespace** (`shadow-vault-build-r765g77p569c94x`) with:
- Solana CLI 3.1.13
- Anchor CLI 1.0.0
- Rust (latest stable)

The code was adapted from anchor-lang 0.28 → 1.0.0 API:
- `CpiContext::new` now takes `Pubkey` not `AccountInfo`
- `invoke`/`invoke_signed` moved to `solana-invoke` crate
- Borrow checker requires key extraction before mutable borrows

## Files

```
shadow-vault/
├── Anchor.toml              # Anchor workspace config
├── program/
│   ├── Cargo.toml           # Rust dependencies (anchor-lang 1.0.0)
│   ├── src/lib.rs           # 602 lines — vault, policy, audit logic
│   └── target/deploy/
│       └── shadow_vault.so  # Compiled binary (208KB)
├── agent/
│   ├── package.json         # Node dependencies
│   └── src/
│       ├── index.ts         # Main agent logic
│       ├── agent.ts         # Agent class
│       ├── policy.ts        # Policy engine
│       ├── encrypt-sim.ts   # FHE simulation
│       ├── zerion-integration.ts
│       └── types.ts
├── ui/
│   ├── index.html
│   ├── package.json
│   └── src/
│       ├── App.tsx          # Interactive demo UI
│       ├── App.css          # Dark theme styles
│       └── main.tsx
└── README.md                # This file
```

## Built With

- [Solana](https://solana.com/) — Blockchain
- [Anchor](https://www.anchor-lang.com/) — Solana framework
- [Encrypt](https://docs.encrypt.xyz/) — FHE on Solana
- [Zerion](https://zerion.io/) — Portfolio data
- [React](https://react.dev/) + [Vite](https://vitejs.dev/) — UI

---

*Built for Colosseum Breakout Hackathon 2026*
*Source: github.com/spiritclawd/shadow-vault*
