# Shadow Vault — Architecture

## System Overview

Shadow Vault is an encrypted AI agent strategy vault built on Solana. It enables AI agents to execute DeFi strategies where all financial data (balances, positions, orders) is encrypted using Fully Homomorphic Encryption (FHE), making strategies private while remaining verifiable.

## Component Architecture

```
                    ┌─────────────────────┐
                    │   Solana Blockchain  │
                    │                     │
                    │  ┌───────────────┐  │
                    │  │ Shadow Vault  │  │
                    │  │   Program     │  │
                    │  │  (Rust/Anchor)│  │
                    │  └───────┬───────┘  │
                    │          │          │
                    └──────────┼──────────┘
                               │
                    ┌──────────┼──────────┐
                    │          │          │
              ┌─────┴─────┐   │   ┌──────┴──────┐
              │   Agent   │   │   │     UI      │
              │(TypeScript)│   │   │   (React)   │
              │           │   │   │             │
              │ • Zerion  │   │   │ • Dashboard │
              │ • Policy  │   │   │ • Controls  │
              │ • FHE Sim │   │   │ • Audit Log │
              └───────────┘   │   └─────────────┘
                              │
                    ┌─────────┴─────────┐
                    │   Encrypt FHE     │
                    │   (On-chain)      │
                    │                   │
                    │ • Encrypted math  │
                    │ • Ciphertext refs │
                    │ • Key management  │
                    └───────────────────┘
```

## Smart Contract Design (`program/src/lib.rs`)

### State Accounts

#### Vault
```rust
pub struct Vault {
    pub owner: Pubkey,          // Vault owner
    pub agent: Pubkey,          // Authorized agent
    pub policy_id: Pubkey,      // Linked policy
    pub total_deposited: u64,   // Lifetime deposits
    pub total_withdrawn: u64,   // Lifetime withdrawals
    pub order_count: u64,       // Total orders executed
    pub is_active: bool,        // Vault status
    pub bump: u8,               // PDA bump
}
```

#### Policy
```rust
pub struct Policy {
    pub vault: Pubkey,              // Linked vault
    pub max_order_size: u64,        // Max single order (lamports)
    pub max_spend_per_epoch: u64,   // Max spend per epoch
    pub epoch_duration: i64,        // Epoch length (seconds)
    pub allowed_tokens: [Pubkey; 8], // Whitelisted tokens
    pub allowed_protocols: [Pubkey; 4], // Whitelisted protocols
    pub max_positions: u8,          // Max concurrent positions
    pub is_active: bool,            // Policy status
    pub bump: u8,
    // Runtime state
    pub epoch_start: i64,
    pub epoch_spent: u64,
    pub expiry: i64,
}
```

#### AuditEntry
```rust
pub struct AuditEntry {
    pub vault: Pubkey,
    pub action: AuditAction,        // Deposit/Withdraw/Order/Decrypt
    pub timestamp: i64,
    pub data_ct: [u8; 32],          // Encrypted action data
    pub actor: Pubkey,
    pub sequence: u64,
    pub bump: u8,
}
```

### Instructions

| Instruction | Description | Access |
|-------------|-------------|--------|
| `create_vault` | Create new vault with encrypted balance | Owner |
| `deposit` | Deposit SOL into vault (encrypted) | Owner |
| `execute_order` | Execute encrypted trade | Agent |
| `withdraw` | Withdraw from vault | Owner |
| `log_audit` | Record action in audit trail | Agent |
| `update_agent` | Change authorized agent | Owner |
| `deactivate_vault` | Freeze vault | Owner |
| `deactivate_policy` | Freeze policy | Owner |

### Security Model

1. **PDA-based ownership** — Vault and Policy derived from owner's pubkey
2. **Agent authorization** — Only designated agent can execute orders
3. **Policy enforcement** — All orders checked against policy BEFORE execution
4. **Audit trail** — Every action logged with encrypted data
5. **Owner-only decryption** — Only owner key can decrypt vault data

### Transfer Mechanism

Uses `solana_invoke::{invoke, invoke_signed}` for SOL transfers:
- **Deposit:** `invoke(transfer(owner → vault))`
- **Withdraw:** `invoke_signed(transfer(vault → owner), vault_seeds)`

The vault is a PDA, so withdrawals require `invoke_signed` with the vault's seeds.

## Agent Design (`agent/src/`)

### Agent Class
- Manages vault lifecycle
- Executes trades with policy checks
- Maintains encrypted state locally
- Integrates with external data sources

### Policy Engine
- Pre-execution validation
- Epoch tracking with auto-reset
- Position limits
- Token/protocol whitelisting

### FHE Simulation
- Generates "ciphertext" byte arrays
- Simulates encrypted computation
- Maintains encrypted audit log
- Owner decryption simulation

### Zerion Integration
- Portfolio data via Zerion CLI
- Position tracking
- Balance monitoring

## UI Design (`ui/src/App.tsx`)

### Dark Theme
- Color palette: Deep navy (#0a0f1c) to purple (#1a0f2e)
- Accent: Cyan (#00d4ff) for encryption indicators
- Warning: Red (#ff4757) for policy violations
- Success: Green (#00ff88) for completed actions

### Interactive Demo Flow
1. **Hero** — Problem statement + value proposition
2. **Create Vault** — Shows encrypted balance initialization
3. **Deposit** — 10 SOL → encrypted
4. **Agent Trades** — 3 encrypted orders
5. **Policy Rejection** — Order exceeds 2 SOL max
6. **Audit Log** — Shows encrypted vs plaintext data
7. **Owner View** — Decrypted balances and positions

### Real-time Updates
- Simulated agent execution with timing
- Progressive disclosure of encrypted data
- Visual distinction between encrypted and plaintext

## FHE Integration Pattern

The program is designed to integrate with the Encrypt SDK:

```rust
// Future integration point
pub fn execute_order(ctx: Context<ExecuteOrder>, ...) -> Result<()> {
    // Current: Store ciphertext reference
    // Future: Encrypt CPI call
    // let encrypt_ctx = EncryptContext { ... };
    // encrypt_ctx.execute_order_graph(balance_ct, amount_ct, price_ct, ...)?;
}
```

Currently stores `[u8; 32]` ciphertext references. When Encrypt SDK reaches production on Solana, these will be replaced with actual FHE operations.

## Deployment

### Program
```bash
# In GitHub Codespace
anchor build
# → target/deploy/shadow_vault.so (208KB)

# Deploy to devnet
solana program deploy target/deploy/shadow_vault.so
```

### UI
```bash
npm run build
# Deploy to GitHub Pages via gh-pages branch
```

### Agent
```bash
npm run demo
# Runs interactive demo with simulated FHE
```

---

*Architecture v1.0 — April 21, 2026*
