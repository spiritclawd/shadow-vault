# Shadow Vault — Build Log

Complete development history for the Colosseum Breakout Hackathon 2026 submission.

## Timeline

### Day 1 — April 20, 2026

**Phase 1: Research & Architecture**
- Researched Colosseum hackathon structure (open-ended, $30K grand prize + side tracks)
- Identified top prize tracks: Encrypt ($15K), Umbra ($10K), Zerion ($7K), Torque ($3K)
- Designed Shadow Vault architecture: encrypted AI agent strategy vault using FHE
- Total prize ceiling: $65K+

**Phase 2: Build**
- Created full project structure: `program/`, `agent/`, `ui/`
- **Program (592 lines Rust):** Solana/Anchor vault with policy engine and audit trail
- **Agent (648 lines TypeScript):** Agent with Zerion CLI integration and FHE simulation
- **UI (686 lines React/CSS):** Interactive dark-themed demo interface
- Total: 2,054 lines of code

**Phase 3: Demo**
- Agent demo fully functional with 6 core features:
  1. Vault creation (encrypted balances)
  2. 10 SOL deposit (encrypted immediately)
  3. 3 encrypted orders executed
  4. Policy rejection (3 SOL > 2 SOL max)
  5. Audit log with encrypted/plaintext distinction
  6. Owner-only decryption view (6.50 SOL remaining, 3.50 SOL in positions)

**Phase 4: Compilation Issues**
- Local machine has Solana CLI 3.x (incompatible with older Anchor versions)
- Code written for anchor-lang 0.28, but local environment mismatched
- Decision: Pivot to demo-first, fix compilation later

### Day 2 — April 21, 2026

**Phase 5: GitHub Setup**
- Created GitHub repository: https://github.com/spiritclawd/shadow-vault
- Deployed UI to GitHub Pages: https://spiritclawd.github.io/shadow-vault/
- Created GitHub Codespace for compilation: `shadow-vault-build-r765g77p569c94x`

**Phase 6: Solana Compilation in Codespace**

The journey to compile `shadow_vault.so`:

1. **Installed tools in Codespace:**
   ```bash
   curl --proto "=https" --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
   sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"
   cargo install --git https://github.com/coral-xyz/anchor avm --force
   ```
   Result: Solana CLI 3.1.13 + Anchor CLI 1.0.0

2. **Fix: Anchor.toml location**
   - Moved `Anchor.toml` from `program/` to project root
   - Anchor requires workspace config at root level

3. **Fix: Program ID**
   - Generated valid keypair: `HgJgRAkYEz1y5fx7wLkVfMSpfxuNsGgyBguXAnzkR9Qa`
   - Updated `declare_id!` in `lib.rs` and `Anchor.toml`

4. **Fix: anchor-lang 0.28 → 1.0.0 API migration**

   **Error 1: `CpiContext::new` signature changed**
   ```
   error[E0308]: mismatched types
   expected `Pubkey`, found `AccountInfo<'_>`
   ```
   - Anchor 1.0.0: `CpiContext::new(program_id: Pubkey, accounts: T)`
   - Old: `CpiContext::new(program: AccountInfo, accounts: T)`

   **Fix:** Replaced `CpiContext` with native `invoke`/`invoke_signed` from `solana-invoke` crate

   **Error 2: `invoke`/`invoke_signed` import not found**
   ```
   error[E0432]: unresolved imports `solana_program::invoke`, `solana_program::invoke_signed`
   ```
   - In solana-program v2, these moved to `solana-invoke` crate

   **Fix:** Added `solana-invoke = "0.5"` to `Cargo.toml`

   **Error 3: Borrow checker conflict**
   ```
   error[E0502]: cannot borrow `ctx.accounts.vault` as immutable
   because it is also borrowed as mutable
   ```
   - In `deposit()`: `vault` was mutably borrowed, then `ctx.accounts.vault.key()` tried immutable borrow

   **Fix:** Extract keys before mutable borrow:
   ```rust
   let vault_key = ctx.accounts.vault.key();
   let owner_key = ctx.accounts.owner.key();
   // ... use immutable borrow for checks ...
   // ... transfer ...
   let vault = &mut ctx.accounts.vault;  // mutable borrow after transfer
   ```

   **Error 4: Borrow checker in `execute_order()`**
   - `vault` borrowed as `&` but needs `&mut` for `vault.order_count += 1`

   **Fix:** Changed `let vault = &ctx.accounts.vault;` to `let vault = &mut ctx.accounts.vault;`

5. **Final build result:**
   ```
   Compiling shadow-vault v0.1.0
   Finished `release` profile [optimized] target(s) in 1.95s
   shadow_vault.so — 208,648 bytes
   ```

**Phase 7: Video Production**
- Screen recording with ffmpeg on DISPLAY=:1 (1600x900, 25fps)
- Firefox launched with clean profile (translation popup disabled)
- Narration generated via Edge TTS
- Video + audio combined with ffmpeg
- Two versions produced:
  - v1: Had Firefox "Profile Missing" dialog popup
  - v2: Clean recording

## Architecture Decisions

### Why FHE simulation instead of real Encrypt SDK?
The Encrypt SDK for Solana is in pre-alpha (devnet only). For the hackathon demo:
- Program stores ciphertext references as `[u8; 32]` byte arrays
- Agent simulates FHE operations (real encryption would use Encrypt CPI)
- UI shows the concept clearly without needing live Encrypt infrastructure

### Why native `invoke` instead of Anchor CPI?
Anchor 1.0.0 changed the `CpiContext` API. Using `solana_invoke::{invoke, invoke_signed}` directly:
- Avoids API version mismatch
- Works with any anchor-lang version
- Standard pattern for Solana native transfers in Anchor programs

### Why GitHub Codespaces?
Local machine has Solana CLI 3.x which is incompatible with anchor-cli versions. Codespaces provides:
- Clean Ubuntu container with root access
- Pre-configured Solana toolchain
- 32GB RAM for compilation
- No impact on local machine

## File Sizes

| File | Size | Lines |
|------|------|-------|
| `program/src/lib.rs` | 18.8 KB | 602 |
| `agent/src/index.ts` | 16.2 KB | 648 |
| `ui/src/App.tsx` | 19.1 KB | 686 |
| `shadow_vault.so` | 208 KB | — |
| **Total source** | **54 KB** | **1,936** |

## Lessons Learned

1. **Anchor version compatibility is critical** — Always check anchor-lang version matches anchor-cli
2. **Codespaces are powerful for Solana** — Clean build environment, no local pollution
3. **Borrow checker in Solana is strict** — Extract keys before mutable borrows
4. **Firefox on Linux needs explicit profile management** — Translation popups can ruin demos
5. **Demo-first approach works** — Build the working demo, fix compilation details later

## Next Steps

- [ ] Deploy program to Solana devnet
- [ ] Integrate real Encrypt SDK when available
- [ ] Add Zerion mainnet portfolio data
- [ ] Extend video to full 5-minute pitch
- [ ] Submit to all prize tracks

---

*Last updated: April 21, 2026*
*Built by: Zaia (AI CEO) + Carlos (Founder)*
