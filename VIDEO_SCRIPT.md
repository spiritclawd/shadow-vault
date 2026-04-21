# Shadow Vault — Video Demo Script
## Duration: 2:30 - 3:00 minutes

---

### SCENE 1: THE HOOK (0:00 - 0:15)
**Visual:** Dark screen, terminal cursor blinking. Fast typing.

**Text overlay:** 
```
Every AI agent on Solana is naked.
Their trades. Their positions. Their strategy.
All visible. All copyable.
```

**Audio:** Low electronic hum, building tension.

---

### SCENE 2: THE PROBLEM (0:15 - 0:45)
**Visual:** Split screen — left side shows Solana Explorer with real transactions, 
right side shows a bot copying trades in real-time.

**Voiceover:**
"Autonomous agents are trading billions on Solana. But every trade is public. 
MEV bots extract value on every execution. Competitors copy strategies in real-time. 
Your agent's alpha? Gone before it executes."

**Text overlay:** 
```
$4B+ daily agent volume
100% visible on-chain
```

---

### SCENE 3: THE SOLUTION (0:45 - 1:15)
**Visual:** Shadow Vault logo animation. Then show the 3-instruction diagram.

**Voiceover:**
"Shadow Vault gives agents encrypted vaults. Three instructions. Total privacy.

Initialize — create a vault only you control.
Deposit — lock funds with a commitment hash. The chain sees a hash, not an amount.
Withdraw — redeem with a nullifier proof. No link between deposit and withdrawal."

**Text overlay:**
```
9yhMKQU4baJPW2ncaMrEDAFGy4R7MvUsDgfoshEEdKRH
Live on Solana Devnet
```

---

### SCENE 4: LIVE DEMO (1:15 - 2:00)
**Visual:** Screen recording of the interactive demo.

**Steps to show:**
1. Create vault → "Vault created. Balance encrypted."
2. Deposit 10 SOL → Show commitment hash on-chain
3. Execute 3 trades → Each shows encrypted amounts
4. Policy rejection → "Order rejected: exceeds max position size"
5. Audit log → All entries encrypted, compliance-friendly

**Voiceover:**
"Watch an agent use Shadow Vault. Deposit funds — encrypted. Execute trades — encrypted. 
The policy engine enforces limits without revealing positions. Every action logged. 
Compliance-friendly. MEV-proof."

---

### SCENE 5: THE CODE (2:00 - 2:15)
**Visual:** Quick flash of TypeScript SDK code. Clean, 3-method API.

**Voiceover:**
"Integrate in 5 minutes. Three methods. Works with any Solana agent framework."

**Text overlay:**
```typescript
ShadowVaultClient.init()
vault.deposit()
vault.executeOrder()
```

---

### SCENE 6: THE CLOSE (2:15 - 2:30)
**Visual:** Landing page. Explorer link. GitHub link.

**Voiceover:**
"Shadow Vault. Private trading infrastructure for AI agents.
Built on Solana. Live on devnet. Open source."

**Text overlay:**
```
spiritclawd.github.io/shadow-vault
github.com/spiritclawd/shadow-vault
Colosseum Hackathon 2026
```

---

## Production Notes

- **Total slides/frames:** ~12-15 keyframes
- **Style:** Dark, terminal aesthetic, purple accents
- **Pacing:** Fast in problem section, slower in demo
- **Music:** Electronic, building, drops at "Shadow Vault" reveal
- **Font:** JetBrains Mono for code, Space Grotesk for text
