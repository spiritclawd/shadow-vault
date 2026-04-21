# Shadow Vault v0.2 — Voiceover Script

**Duration:** ~2:30
**Record each scene separately, then overlay on video.**

---

## Scene 1: Hero (0:00 – 0:25)

> Right now — this second — every AI agent trading on Solana is leaking money.
>
> Your strategies, your positions, your order sizes — all exposed on-chain. Visible to anyone with a browser and a bot.
>
> Shadow Vault stops the bleeding.

---

## Scene 2: Problem (0:25 – 0:50)

> Look at any Solana explorer. Every trade tells a story.
>
> What token. How much. When. Your entire strategy — leaked.
>
> MEV bots extracted over 1.2 billion dollars from Solana traders last year alone. Searchers make 50 to 100 million a month front-running unprotected transactions. That's your edge, gone.
>
> AI agents make it worse. They trade faster, more predictably, and at scale. One exposed agent means your alpha gets copied in milliseconds.

---

## Scene 3: How It Works (0:50 – 1:15)

> Shadow Vault keeps your trades private using three simple ideas.
>
> First: hide the amounts. When you deposit, we store a scrambled fingerprint — not the number. No one can reverse it.
>
> Second: break the link. When you withdraw, you prove you're entitled — without revealing which deposit was yours. Vanished.
>
> Third: encrypt the orders. Your trades go on-chain as one-way hashes. The details? Only you see them.
>
> Even your risk limits stay hidden.

---

## Scene 4: Live Demo (1:15 – 1:45)

> This isn't a whitepaper. It's deployed. On Solana devnet. Right now.
>
> Program ID: seven-NN-xu-four. You can check it yourself on the explorer.
>
> Watch this deposit appear on-chain. You see a commitment hash — a scrambled fingerprint. The amount? Gone. Invisible.
>
> Now watch the order execute. You see an encrypted hash on-chain. The pair, the side, the price, the size — all hidden. All yours alone.
>
> And the withdrawal. A nullifier appears. No trail. No link. Untraceable back to the original deposit.

---

## Scene 5: Code (1:45 – 2:10)

> One line of code. One.
>
> `npm install @shadow-vault/solana`
>
> That's it. You're private.
>
> Create a commitment. Execute an order. Withdraw with a nullifier. The SDK handles every bit of the cryptography — so you don't have to.
>
> Works with any Solana trading bot. Any agent framework. Any DeFi protocol. Drop it in. Ship it.

---

## Scene 6: Close (2:10 – 2:30)

> Shadow Vault. Privacy for AI agents on Solana.
>
> Deployed. Working. Live on devnet today.
>
> Open source. Built for the Encrypt hackathon. Every line of code is real — the commitment schemes, the nullifiers, the encrypted references. All verified. All on-chain.
>
> Your AI agent deserves privacy. Go build with it.
>
> GitHub dot com slash spiritclawd slash shadow-vault.

---

## Recording Tips

- **Pace:** Medium-slow. Let each scene breathe.
- **Tone:** Confident, technical, not salesy. Like explaining to a smart friend.
- **Pauses:** Leave 2-3 seconds of silence between scenes for fade transitions.
- **Emphasis:** "NOT" when contrasting what's visible vs hidden. "One" and "That's it" in Scene 5 should land hard.
- **Background music:** Dark ambient / lo-fi electronic. Low volume under voice.
