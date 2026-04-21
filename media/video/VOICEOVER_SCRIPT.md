# Shadow Vault v0.2 — Voiceover Script

**Duration:** ~2:30
**Record each scene separately, then overlay on video.**

---

## Scene 1: Hero (0:00 – 0:25)

> Every AI agent trading on Solana right now is completely exposed.
> 
> Your strategies, your positions, your order sizes — all visible on-chain for anyone to copy, front-run, or exploit.
> 
> Shadow Vault changes that.

---

## Scene 2: Problem (0:25 – 0:50)

> Look at any Solana explorer. Every trade tells a story.
> 
> What token. How much. When. Your entire strategy — leaked.
> 
> MEV bots are already extracting billions from this. It's not a theoretical risk. It's happening right now.
> 
> AI agents make this worse. They trade faster, more predictably, and at scale. One exposed agent means everyone copies your alpha.

---

## Scene 3: How It Works (0:50 – 1:15)

> Shadow Vault uses three privacy primitives.
> 
> One: commitment schemes. When you deposit, we store a hash of your amount — not the amount itself. H of amount, owner, nonce. Nobody can reverse it.
> 
> Two: nullifiers. When you withdraw, you prove you deposited without revealing which deposit. Unlinkable.
> 
> Three: encrypted order references. Your trades go on-chain as hashes. Your strategy stays yours.
> 
> Policy limits? Also committed. Nobody knows your risk parameters.

---

## Scene 4: Live Demo (1:15 – 1:45)

> This isn't theory. It's deployed. On Solana devnet. Right now.
> 
> Program ID: seven-NN-xu-four. You can verify it on the explorer.
> 
> Here's a real deposit. You see a commitment hash. You do NOT see the amount.
> 
> Here's a real order execution. You see an encrypted hash. You do NOT see the pair, the side, the price, or the size.
> 
> Here's a real withdrawal via nullifier. Unlinkable to any specific deposit.

---

## Scene 5: Code (1:45 – 2:10)

> One line of code. That's all it takes.
> 
> npm install at-shadow-vault slash solana.
> 
> Create a commitment. Execute an order. Withdraw with a nullifier. The SDK handles all the cryptography.
> 
> Compatible with any Solana trading bot, any agent framework, any DeFi protocol.

---

## Scene 6: Close (2:10 – 2:30)

> Shadow Vault. Privacy for AI agents on Solana.
> 
> Deployed on devnet. Open source. Built for the Encrypt hackathon.
> 
> The code is real. The privacy is real. The commitment scheme, the nullifiers, the encrypted references — all working, all on-chain.
> 
> GitHub dot com slash spiritclawd slash shadow-vault.

---

## Recording Tips

- **Pace:** Medium-slow. Let each scene breathe.
- **Tone:** Confident, technical, not salesy. Like explaining to a smart friend.
- **Pauses:** Leave 2-3 seconds of silence between scenes for fade transitions.
- **Emphasis:** "NOT" when contrasting what's visible vs hidden.
- **Background music:** Dark ambient / lo-fi electronic. Low volume under voice.
