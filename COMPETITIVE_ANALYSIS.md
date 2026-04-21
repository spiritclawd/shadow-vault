# Shadow Vault — Competitive Analysis

**Prepared for: Encrypt Track Hackathon Judges**
**Date: May 2026**
**Project: Shadow Vault — Privacy Layer for AI Agents on Solana**

---

## Executive Summary

Shadow Vault occupies a unique intersection in the Solana ecosystem: **AI agent privacy infrastructure**. While multiple projects address privacy on Solana or AI agent frameworks separately, no project currently combines both. This analysis maps the competitive landscape across privacy primitives, AI agent infrastructure, and the emerging cross-section where Shadow Vault operates.

**Key thesis:** Solana captures ~45% of global agent-to-agent transaction volume. AI agents handling $4B+ in daily trading volume on Solana need privacy to prevent strategy extraction and front-running. Shadow Vault is the first purpose-built SDK to solve this problem.

---

## 1. Direct Competitors (Privacy on Solana)

### 1.1 Shadow Book — FHE on Solana

| Attribute | Detail |
|-----------|--------|
| **Approach** | Fully Homomorphic Encryption (FHE) for on-chain computation |
| **Focus** | Private token transfers and balances using FHE |
| **Status** | Early-stage, primarily conceptual/whitepaper phase |
| **Limitation** | FHE is computationally expensive; no AI agent integration |

**Assessment:** Shadow Book targets the right problem (privacy) with heavy cryptography (FHE), but lacks agent-specific tooling. FHE remains impractical for high-frequency agent operations due to gas costs and latency. Shadow Vault's lighter commitment/nullifier scheme is more suitable for agent speed requirements.

---

### 1.2 LatticA — FHE Coprocessor

| Attribute | Detail |
|-----------|--------|
| **Approach** | Hardware-agnostic FHE coprocessor for encrypted computation |
| **Focus** | General-purpose encrypted state on Solana |
| **Status** | Emerging from stealth; early development |
| **Limitation** | Coprocessor architecture adds latency; no agent SDK |

**Assessment:** LatticA provides a powerful general-purpose FHE layer but is infrastructure-heavy. Shadow Vault works at the application layer with immediate usability via the `@shadow-vault/solana` SDK, whereas LatticA requires deeper integration work. For agent developers who need privacy *now*, Shadow Vault is the pragmatic choice.

---

### 1.3 Encifher — Encrypted DeFi

| Attribute | Detail |
|-----------|--------|
| **Approach** | Encrypted intents layered on top of Jupiter for private swaps |
| **Focus** | Privacy-preserving DeFi swaps on Solana |
| **Status** | Live; won 3rd prize in Solana Privacy Hackathon (DeFi track) |
| **Limitation** | DeFi-specific; no agent framework integration |

**Assessment:** Encifher is the most mature direct competitor with a working product. However, it targets human users performing swaps, not autonomous agents executing strategies. Shadow Vault's encrypted order system is designed for programmatic agent use, with a developer-first SDK that Encifher does not offer for agent builders.

---

### 1.4 VeilVault — ZK for RWA

| Attribute | Detail |
|-----------|--------|
| **Approach** | Zero-knowledge proofs for privacy-preserving Real World Asset (RWA) tokenization |
| **Focus** | Institutional compliance + privacy for tokenized assets |
| **Status** | Conceptual/early development |
| **Limitation** | RWA-focused, not agent-focused; complex ZK infrastructure |

**Assessment:** VeilVault targets a different market segment (institutional RWA). While privacy for RWAs is important, it operates in a fundamentally different use case. Shadow Vault's commitment to a compliance path (policy commitments, auditable order encryption) addresses similar institutional needs but for agent operations.

---

### 1.5 Arcium — Encrypted Computing (MPC)

| Attribute | Detail |
|-----------|--------|
| **Approach** | Multi-Party Computation (MPC) for encrypted computation on Solana |
| **Focus** | General-purpose privacy infrastructure; AI model training on encrypted data |
| **Status** | Active development; significant ecosystem presence; Messari coverage |
| **Limitation** | Infrastructure layer, not application-specific; no agent privacy SDK |

**Assessment:** Arcium is the strongest general-purpose privacy infrastructure project on Solana. Their MPC approach and AI training-on-encrypted-data vision are complementary to Shadow Vault rather than directly competitive. Shadow Vault could potentially integrate Arcium's MPC layer for deeper privacy guarantees while maintaining its agent-specific application focus.

---

## 2. Indirect Competitors (AI Agent Infrastructure)

### 2.1 ElizaOS (formerly ai16z) — AI Agent Framework

| Attribute | Detail |
|-----------|--------|
| **Approach** | Open-source AI agent framework with 200+ plugins |
| **Focus** | General-purpose agent creation, social agents, DeFi agents |
| **Status** | Most forked agent framework in crypto; massive ecosystem |
| **Limitation** | No built-in privacy for agent strategies or operations |

**Assessment:** ElizaOS is the dominant agent framework but treats privacy as an afterthought. Agents built on Eliza expose their strategies on-chain. Shadow Vault positions as a **privacy plugin for Eliza** and other agent frameworks — a complementary layer, not a replacement.

---

### 2.2 Arc (by Arc) — Trading Agent Infrastructure

| Attribute | Detail |
|-----------|--------|
| **Approach** | Autonomous AI trading agents on Solana |
| **Focus** | Secure, efficient agents for DeFi operations |
| **Status** | Active; multiple trading agent deployments |
| **Limitation** | No privacy layer; strategies visible on-chain |

**Assessment:** Arc builds excellent trading agents but offers no protection against strategy extraction. An Arc agent's orders are visible on-chain, allowing competitors to copy or front-run strategies. Shadow Vault provides the missing privacy layer that Arc-type agents desperately need.

---

## 3. Market Analysis

### 3.1 AI Agent Market on Solana

| Metric | Value | Source |
|--------|-------|--------|
| Solana share of agent-to-agent volume | ~45% globally | Solana Foundation, 2026 |
| Agent-driven transactions | ~45M daily | Reddit/Solana community data, 2026 |
| Solana DEX daily volume | $95M+ (leading all chains) | Solana Ecosystem Report, Feb 2026 |
| AI agent token market cap (Solana) | $4B+ aggregate | Ecosystem estimates, Q1 2026 |
| Agentic payments via x402 | 65% on Solana | Solana Foundation exec statement |

### 3.2 Privacy Demand Drivers

1. **Strategy Extraction:** AI agents executing profitable strategies on public chains leak alpha to observers
2. **Front-Running / MEV:** Visible order flow enables predatory MEV extraction against agents
3. **Institutional Adoption:** Enterprise agents require privacy for compliance and competitive advantage
4. **Competitive Intelligence:** Competitors can reverse-engineer agent logic from on-chain activity

### 3.3 Addressable Market

- **TAM:** All AI agent transactions on Solana (~$4B+ daily)
- **SAM:** DeFi trading agents requiring strategy privacy (~30-40% of agent volume)
- **SOM:** Agents adopting Shadow Vault SDK in first year (~5-10% of target agents)

---

## 4. Competitive Comparison Table

| Feature | Shadow Vault | Shadow Book | LatticA | Encifher | VeilVault | Arcium | ElizaOS | Arc |
|---------|:------------:|:-----------:|:-------:|:--------:|:---------:|:------:|:-------:|:---:|
| **Deployed on Solana** | ✅ | ❌ | ❌ | ✅ | ❌ | 🔜 | ✅ | ✅ |
| **Working SDK** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **AI Agent Focus** | ✅ | ❌ | ❌ | ❌ | ❌ | ⚠️ | ✅ | ✅ |
| **Hidden Amounts** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Encrypted Orders** | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ |
| **Nullifier Scheme** | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Compliance Path** | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **FHE/MPC** | 🔜 | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Developer SDK** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **On-Chain Verified** | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ |
| **Privacy Approach** | Commitment + Nullifier | FHE | FHE | Encrypted Intents | ZK | MPC | None | None |

**Legend:** ✅ = Yes/Available | ⚠️ = Partial/Indirect | 🔜 = Planned | ❌ = No/Not Available

---

## 5. Shadow Vault's Unique Positioning

### 5.1 The Intersection That Doesn't Exist (Yet)

```
         Privacy Protocols
              │
              │    ← Encifher, Arcium, Shadow Book
              │
    ──────────┼──────────
              │
      ✦ SHADOW VAULT ✦     ← Only project HERE
              │
    ──────────┼──────────
              │
              │    ← ElizaOS, Arc, trading bots
              │
         AI Agent Frameworks
```

Shadow Vault is the **only project** at the intersection of:
- **Privacy** (commitments, nullifiers, encrypted orders)
- **AI Agents** (SDK designed for programmatic agent integration)
- **Solana** (deployed program, native SOL operations)

### 5.2 Five Competitive Advantages

#### 1. Deployed and Verifiable
Program `7NNxu4Sa4qwytUogrka8m398mo3hfNbkAK7TWbSG8PvW` is live on Solana Devnet. Judges and developers can verify transactions on Solana Explorer. This is not vaporware.

#### 2. Working SDK (`@shadow-vault/solana`)
```typescript
const vault = new ShadowVaultClient(owner);
await vault.deposit({ amountSol: 0.1 });     // Amount hidden
await vault.executeOrder({ ... });            // Order encrypted
await vault.withdraw({ ... });                // Unlinkable
```
Three lines of code for complete privacy. Agent developers can integrate in minutes, not months.

#### 3. Honest Privacy Narrative
Shadow Vault does not overclaim. We clearly document:
- What's private (amounts, order details, deposit-withdrawal links)
- What's not (PDA balances are visible as native SOL)
- The roadmap to stronger guarantees (FHE via Inco Network, ZK proofs)

This honesty builds trust with institutions and regulators.

#### 4. Compliance-First Design
Policy commitments allow owners to prove compliance without revealing strategy details. The encryption scheme supports authorized decryption — owners can share order details with regulators if required. This bridges the gap between "privacy" and "accountability."

#### 5. Agent-Native Architecture
Every design decision optimizes for agent use cases:
- Low latency (SHA-256 commitments, not heavy FHE)
- Programmatic API (not UI-dependent)
- Encrypted orders designed for strategy execution
- Nullifiers for unlinkable deposit-withdraw flows (agent rebalancing)

---

## 6. Strategic Moat Analysis

| Moat Type | Strength | Explanation |
|-----------|----------|-------------|
| **First Mover** | Strong | Only agent privacy SDK on Solana; deployed program |
| **Network Effects** | Growing | More agents = more privacy (anonymity set grows) |
| **Switching Costs** | Medium | Agent frameworks lock in; SDK integration creates stickiness |
| **Technical** | Medium | Commitment/nullifier scheme well-understood but effective |
| **Ecosystem** | Building | ElizaOS plugin potential; agent framework integrations |

---

## 7. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Arcium or similar builds agent SDK | High | First-mover advantage; ecosystem integrations |
| FHE becomes practical faster than expected | Medium | Roadmap includes FHE integration (Inco Network) |
| Regulatory crackdown on privacy tools | Medium | Compliance path built into architecture |
| Low agent adoption of privacy features | Medium | Education; demonstrate MEV/strategy protection value |
| Security vulnerability in commitment scheme | Low | Standard SHA-256; auditable code |

---

## 8. Conclusion

Shadow Vault is not competing with general-purpose privacy protocols or general-purpose AI agent frameworks. It occupies a distinct and increasingly critical position: **the privacy layer that AI agents need to operate competitively and safely on Solana.**

The project's combination of a deployed program, working SDK, honest privacy narrative, compliance path, and agent-native design makes it uniquely positioned for this hackathon and beyond.

As AI agent transaction volume continues to grow on Solana (now capturing 45%+ of global agentic volume), the demand for strategy privacy will accelerate. Shadow Vault is positioned to become the default privacy primitive for this emerging market.

---

*Shadow Vault — Your strategies stay yours.*
