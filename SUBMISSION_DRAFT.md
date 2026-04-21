# Shadow Vault — Colosseum Submission Draft

## Step 1: Project Info

### What are you building, and who is it for?

**Every AI agent trading on Solana is a sitting duck.** Their strategies, positions, and order sizes are fully visible on-chain — making them instant targets for front-running, MEV extraction, and strategy theft.

Shadow Vault is the privacy layer that fixes this.

We use cryptographic primitives to hide what agents are doing without sacrificing verifiability:
- **Commitment schemes** — deposit amounts hidden behind SHA-256 hashes
- **Nullifier schemes** — withdrawals unlinkable to specific deposits (double-spend proof)
- **Encrypted order references** — trade details encrypted client-side, only hashes stored on-chain

**Built for:** AI agent developers, quant trading teams, and DeFi protocols that need strategy privacy to survive in adversarial markets.

### Why did you decide to build this, and why build it now?

The timing is existential — not optional:

1. **AI agents are exploding on Solana.** Eliza, Griffain, Arc, autonomous trading bots — the ecosystem has gone from near-zero to hundreds of active agents in under 6 months. Every new agent is another exposed strategy.
2. **MEV extraction is accelerating.** Solana MEV bots extracted $1.5B+ in 2024 alone. Faster, more predictable AI agents are the juiciest targets humans have ever created.
3. **Zero agent privacy infrastructure exists today.** Shadow Book builds FHE infra but has no agent support. LatticA is a coprocessor that isn't deployed. Encifher focuses on DeFi primitives, not agents. **We are the only project at the intersection of AI + privacy + Solana.**
4. **Without privacy, every profitable agent strategy gets arbitraged away in minutes.** The next wave of DeFi is agent-driven — but only if agents can trade without being watched.

### What technologies are you using or integrating with?

**Implemented (deployed on Solana devnet):**
- **Solana + Anchor** — on-chain program with commitment scheme (SHA-256 hash of amount || owner || nonce) and nullifier scheme (bitmap-based double-spend prevention)
- **Encrypted order references** — client-side symmetric encryption, on-chain hash verification
- **TypeScript SDK** — `@shadow-vault/solana` (published, CJS + ESM + TypeScript types)
- **Solana Web3.js** — on-chain interactions

**Roadmap (not yet implemented):**
- FHE (Fully Homomorphic Encryption) — planned for future versions to enable computation on encrypted data
- ZK proofs — planned for trustless verification without revealing inputs
- Mainnet deployment — after security audit

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

**What's real and working today (not vaporware):**
- Program deployed on devnet — verifiable on Solana Explorer
- Commitment hashes hide deposit amounts from observers
- Nullifiers make withdrawals cryptographically unlinkable to deposits
- Order details encrypted client-side, only hashes stored on-chain
- TypeScript SDK built, tested with real on-chain transactions, ready for npm publish

**Competitive position:** Shadow Book builds FHE infrastructure but has zero agent support. LatticA is an undeployed coprocessor. Encifher targets DeFi, not agents. **We are the only project building privacy specifically for AI agents on Solana.**

**Radical transparency:** We don't pretend to have FHE or ZK today. Native SOL balances remain visible (architectural constraint). What we ship is honest, working privacy primitives — not security theater. FHE and ZK are on our public roadmap, clearly marked as future work.

