# Shadow Vault — Encrypted AI Agent Strategy Vault

**Solana × Encrypt FHE × Zerion CLI × Scoped Policies**

An AI agent that executes DeFi strategies on Solana where all positions, balances, and orders are fully encrypted using FHE (Fully Homomorphic Encryption). Nobody can see what the agent is doing.

## The Problem

On-chain AI agents are exploding — 15M+ payments on Solana. But every agent's strategy is **public**. Every position is visible. Every order can be front-run. No serious fund will deploy capital when the entire world can see their moves.

## The Solution

Shadow Vault uses **FHE** (via Encrypt) to compute on encrypted data without ever decrypting on-chain. The agent's balance, positions, and orders remain encrypted end-to-end. A scoped policy engine enforces risk limits before any order executes.

## Tracks

| Track | Prize | Why |
|-------|-------|-----|
| Encrypt | $15K | FHE for encrypted capital markets |
| Umbra | $10K | Privacy layer for fund flows |
| Zerion | $7K | Agent CLI with scoped policies |
| Torque | $3K | MCP agent integration |
| Grand Prize | $30K | Novel agent economy infrastructure |

**Total: $65K+**

## Demo

```bash
cd agent && npm run demo
```

## Built for Colosseum Frontier Hackathon 2026
