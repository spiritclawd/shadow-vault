# Shadow Vault — Colosseum Submission Draft

## Step 1: Project Info

### What are you building, and who is it for?

Shadow Vault is a privacy layer for AI trading agents on Solana.

Every AI agent trading on-chain right now is completely exposed — their strategies, positions, and order sizes are visible to anyone with a block explorer. This makes them vulnerable to front-running, MEV extraction, and strategy theft.

Shadow Vault solves this with three cryptographic primitives:
- **Commitment schemes** — deposit amounts are hidden behind SHA-256 hashes
- **Nullifier schemes** — withdrawals are unlinkable to specific deposits
- **Encrypted order references** — trade details are encrypted client-side, only hashes stored on-chain

Built for: AI agent developers, quant trading teams, and DeFi protocols that need strategy privacy without sacrificing verifiability.

### Why did you decide to build this, and why build it now?

AI agents are exploding on Solana. Every week there's a new trading bot, a new autonomous agent, a new alpha strategy. But every single one of them trades in the open.

The timing is critical:
1. AI agents trade faster and more predictably than humans — one exposed agent means instant copy trading
2. MEV bots are already extracting billions from visible strategies
3. The infrastructure for agent privacy simply didn't exist until now

We built Shadow Vault because the next wave of DeFi is agent-driven, and agents need privacy to be viable. Without it, every profitable strategy gets arbitraged away within minutes.

### What technologies are you using or integrating with?

- **Solana** (devnet) — deployed program with Anchor framework
- **Commitment scheme** — SHA-256 based H(amount || owner || nonce)
- **Nullifier scheme** — SHA-256 based H(vault_id || amount || nonce) with bitmap double-spend prevention
- **Encrypted references** — client-side symmetric encryption with on-chain hash verification
- **TypeScript SDK** — `@shadow-vault/solana` npm package (CJS + ESM + TypeScript types)
- **Solana Web3.js** — for on-chain interactions

---

## Step 2: Media and Code

### GitHub link
https://github.com/spiritclawd/shadow-vault

### Product demo video
[Upload shadow-vault-v02-titled.mp4 — after voiceover]

### Live product link
https://spiritclawd.github.io/shadow-vault/

### Access instructions
Program deployed on Solana Devnet.
Program ID: 7NNxu4Sa4qwytUogrka8m398mo3hfNbkAK7TWbSG8PvW
Explorer: https://explorer.solana.com/address/7NNxu4Sa4qwytUogrka8m398mo3hfNbkAK7TWbSG8PvW?cluster=devnet

SDK: `npm install @shadow-vault/solana`
Test with: `npx tsx src/__tests__/live-test.ts` (requires devnet SOL)

### Important GitHub repo context
The repo contains:
- `/program/src/lib.rs` — Anchor program with commitment + nullifier privacy
- `/sdk/` — TypeScript SDK package (@shadow-vault/solana)
- `/agent/src/v02-demo.ts` — Live demo client
- `/PRIVACY_AUDIT.md` — Honest security assessment
- `/BUSINESS_MODEL.md` — Revenue model and market sizing
- `/ROADMAP.md` — Public roadmap to production

---

## Step 3: Team

### Team Telegram contact
@carldlfr

### Accelerator application
Yes (Encrypt Track + Privacy Track + Umbra Side Track)

### Did anyone not listed on the team do meaningful work?
Zaia — AI co-founder and chief operator. Handles infrastructure, deployments, and orchestration. Not a human team member.

### Anything else judges should know?
Shadow Vault v0.2 is deployed and working on Solana devnet with real privacy:
- Commitment hashes hide deposit amounts
- Nullifiers make withdrawals unlinkable
- Order details are encrypted client-side

We are transparent about limitations: native SOL balances are visible (architectural constraint), and FHE/ZK proofs are planned for future versions. What we have today is honest, working privacy — not security theater.

The TypeScript SDK is built, tested with real on-chain transactions, and ready for npm publish.
