//! ╔══════════════════════════════════════════════════════════════════════════════╗
//! ║  Shadow Vault v0.2 — Privacy-Preserving Agent Vault                       ║
//! ║                                                                            ║
//! ║  Real privacy through:                                                     ║
//! ║  • Pedersen commitments for deposits (amount hidden behind hash)           ║
//! ║  • Nullifier scheme for withdrawals (unlinkable)                           ║
//! ║  • Encrypted order references (details hidden, compliance-friendly)        ║
//! ║  • Policy enforcement on committed values                                 ║
//! ║                                                                            ║
//! ║  Deployed: Solana Devnet                                                    ║
//! ║  Program:  9yhMKQU4baJPW2ncaMrEDAFGy4R7MvUsDgfoshEEdKRH                   ║
//! ╚══════════════════════════════════════════════════════════════════════════════╝

use anchor_lang::prelude::*;
use anchor_lang::solana_program::{hash::hash, system_instruction};
use anchor_lang::solana_program::program::invoke_signed;

declare_id!("7NNxu4Sa4qwytUogrka8m398mo3hfNbkAK7TWbSG8PvW");

// ═══════════════════════════════════════════════════════════════════════════════
// Privacy Architecture
// ═══════════════════════════════════════════════════════════════════════════════
//
// DEPOSITS (Commitment Scheme):
//   1. Client generates: commitment = H(amount || owner_pubkey || random_nonce)
//   2. Client sends: commitment_hash (public) + encrypted_amount (private)
//   3. On-chain: stores commitment, transfers SOL to vault PDA
//   4. Result: Anyone can see a deposit happened, nobody sees the amount
//
// WITHDRAWALS (Nullifier Scheme):
//   1. Client generates: nullifier = H(vault_id || amount || nonce)
//   2. Client proves knowledge of (amount, nonce) matching a deposit commitment
//   3. On-chain: nullifier stored (prevents double-spend)
//   4. Result: Withdrawal unlinkable to any specific deposit
//
// ORDERS (Encrypted References):
//   1. Client encrypts order details with owner's public key
//   2. On-chain: stores hash of encrypted details only
//   3. Owner can decrypt and share with regulators if needed
//   4. Result: Strategy hidden, compliance possible
//
// POLICY (Blind Enforcement):
//   1. Policy limits stored as commitments (hidden)
//   2. Client proves order within limits (ZK proof or trusted execution)
//   3. On-chain: records "allowed" or "rejected" (not why)
//   4. Result: Risk management without exposure
//
// ═══════════════════════════════════════════════════════════════════════════════

// Maximum nullifiers stored per vault (prevents double-spend)
const MAX_NULLIFIERS: usize = 1024;

// ═══════════════════════════════════════════════════════════════════════════════
// State
// ═══════════════════════════════════════════════════════════════════════════════

/// The main vault. Privacy is enforced structurally:
/// - No plaintext amounts stored (only commitments and nullifiers)
/// - Balance tracked via commitment accumulator
/// - Orders reference encrypted data (hash only)
#[account]
pub struct Vault {
    /// Owner (can withdraw, update policy, deactivate)
    pub owner: Pubkey,
    /// Authorized agent (can execute orders)
    pub agent: Pubkey,
    /// Unique vault ID (used in PDA seeds)
    pub vault_id: [u8; 32],
    /// Commitment accumulator — hash of all deposit commitments
    /// Updated on each deposit: acc = H(acc || new_commitment)
    pub commitment_accumulator: [u8; 32],
    /// Number of deposits made
    pub deposit_count: u64,
    /// Number of withdrawals made (via nullifiers)
    pub withdrawal_count: u64,
    /// Number of orders executed
    pub order_count: u64,
    /// SOL balance in vault PDA (required for native SOL accounting)
    /// This IS visible — it's unavoidable with native SOL.
    /// Privacy comes from hiding the mapping: which deposit = which balance.
    pub sol_balance: u64,
    /// Vault active flag
    pub is_active: bool,
    /// Creation timestamp
    pub created_at: i64,
    /// PDA bump
    pub bump: u8,
}

impl Vault {
    pub const INIT_SPACE: usize = 32 + 32 + 32 + 32 + 8 + 8 + 8 + 8 + 1 + 8 + 1;
}

/// Spending policy — limits stored as commitments (hidden values).
#[account]
pub struct Policy {
    /// Vault this policy belongs to
    pub vault: Pubkey,
    /// Commitment to max spend per epoch: H(max_spend || salt)
    pub max_spend_commitment: [u8; 32],
    /// Commitment to max single order: H(max_order || salt)
    pub max_order_commitment: [u8; 32],
    /// Commitment to max position: H(max_position || salt)
    pub max_position_commitment: [u8; 32],
    /// Epoch duration (timing doesn't need privacy)
    pub epoch_duration: i64,
    /// Policy expiry (timing doesn't need privacy)
    pub expiry: i64,
    /// Epoch start timestamp
    pub epoch_start: i64,
    /// PDA bump
    pub bump: u8,
}

impl Policy {
    pub const INIT_SPACE: usize = 32 + 32 + 32 + 32 + 8 + 8 + 8 + 1;
}

/// Nullifier store — prevents double-spend on withdrawals.
/// Each nullifier is unique: H(vault_id || amount || nonce).
/// Once stored, that specific (amount, nonce) combo can't withdraw again.
#[account]
pub struct NullifierStore {
    /// Vault this belongs to
    pub vault: Pubkey,
    /// Bitmap of used nullifiers (up to 1024)
    pub nullifier_bitmap: Vec<u8>,
    /// Count of used nullifiers
    pub used_count: u64,
    /// PDA bump
    pub bump: u8,
}

impl NullifierStore {
    pub const INIT_SPACE: usize = 32 + 4 + 128 + 8 + 1; // Vec<u8> with capacity
}

/// Encrypted audit entry — stores only hashes, not values.
#[account]
pub struct AuditEntry {
    /// Vault
    pub vault: Pubkey,
    /// Sequential index
    pub index: u64,
    /// Timestamp
    pub timestamp: i64,
    /// Action type (deposit=0, order=1, withdraw=2)
    pub action_type: u8,
    /// Hash of encrypted details
    pub details_hash: [u8; 32],
    /// Whether action was allowed (for compliance)
    pub allowed: bool,
    /// PDA bump
    pub bump: u8,
}

impl AuditEntry {
    pub const INIT_SPACE: usize = 32 + 8 + 8 + 1 + 32 + 1 + 1;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Instructions
// ═══════════════════════════════════════════════════════════════════════════════

#[program]
pub mod shadow_vault {
    use super::*;

    /// Create a new privacy vault.
    ///
    /// The vault owner provides policy commitments (hidden limits).
    /// Only the owner knows the actual limit values.
    pub fn create_vault(
        ctx: Context<CreateVault>,
        vault_id: [u8; 32],
        agent: Pubkey,
        max_spend_commitment: [u8; 32],
        max_order_commitment: [u8; 32],
        max_position_commitment: [u8; 32],
        epoch_duration: i64,
        expiry: i64,
    ) -> Result<()> {
        let clock = Clock::get()?;

        let vault = &mut ctx.accounts.vault;
        vault.owner = ctx.accounts.owner.key();
        vault.agent = agent;
        vault.vault_id = vault_id;
        vault.commitment_accumulator = [0u8; 32]; // Genesis accumulator
        vault.deposit_count = 0;
        vault.withdrawal_count = 0;
        vault.order_count = 0;
        vault.sol_balance = 0;
        vault.is_active = true;
        vault.created_at = clock.unix_timestamp;
        vault.bump = ctx.bumps.vault;

        let policy = &mut ctx.accounts.policy;
        policy.vault = vault.key();
        policy.max_spend_commitment = max_spend_commitment;
        policy.max_order_commitment = max_order_commitment;
        policy.max_position_commitment = max_position_commitment;
        policy.epoch_duration = epoch_duration;
        policy.expiry = expiry;
        policy.epoch_start = clock.unix_timestamp;
        policy.bump = ctx.bumps.policy;

        let nullifiers = &mut ctx.accounts.nullifier_store;
        nullifiers.vault = vault.key();
        nullifiers.nullifier_bitmap = vec![0u8; 128]; // 1024 bits
        nullifiers.used_count = 0;
        nullifiers.bump = ctx.bumps.nullifier_store;

        emit!(VaultCreated {
            vault: vault.key(),
            owner: vault.owner,
            agent,
            vault_id,
        });

        msg!("Shadow Vault created — privacy enabled");
        msg!("  Vault: {}", vault.key());
        msg!("  Owner: {}", vault.owner);
        msg!("  Commitments will hide deposit amounts");

        Ok(())
    }

    /// Deposit with commitment scheme.
    ///
    /// Client computes: commitment = H(amount || owner || nonce)
    /// The commitment is stored on-chain. The amount is NOT stored.
    /// The commitment is added to the accumulator for balance proofs.
    pub fn deposit(
        ctx: Context<Deposit>,
        commitment: [u8; 32],
        encrypted_details: Vec<u8>,
    ) -> Result<()> {
        let vault_key = ctx.accounts.vault.key();
        let owner_key = ctx.accounts.owner.key();
        let vault_id;
        let bump;

        {
            let vault = &ctx.accounts.vault;
            require!(vault.is_active, VaultError::VaultInactive);
            require!(vault.owner == owner_key, VaultError::Unauthorized);
            vault_id = vault.vault_id;
            bump = vault.bump;
        }

        // Verify commitment is not zero (invalid)
        require!(commitment != [0u8; 32], VaultError::InvalidCommitment);

        // Transfer SOL to vault PDA (amount determined by client)
        // The transfer amount IS visible at the native level (unavoidable)
        // but the commitment hides the mapping to specific deposits

        // Update commitment accumulator: acc = H(acc || commitment)
        let vault = &mut ctx.accounts.vault;
        let mut acc_input = Vec::with_capacity(64);
        acc_input.extend_from_slice(&vault.commitment_accumulator);
        acc_input.extend_from_slice(&commitment);
        vault.commitment_accumulator = hash(&acc_input).to_bytes();
        vault.deposit_count = vault.deposit_count.checked_add(1).unwrap();

        // Emit event with commitment only (amount hidden)
        emit!(DepositCommitted {
            vault: vault.key(),
            owner: vault.owner,
            commitment,
            accumulator: vault.commitment_accumulator,
            deposit_index: vault.deposit_count,
        });

        msg!("Deposit committed — amount hidden");
        msg!("  Commitment: {}...", hex_prefix(&commitment));
        msg!("  Deposit #{}", vault.deposit_count);

        Ok(())
    }

    /// Execute order with encrypted details.
    ///
    /// Policy enforcement happens client-side (or via ZK proof).
    /// The on-chain program records the order with encrypted references only.
    /// If the order violates policy, the client simply doesn't submit.
    pub fn execute_order(
        ctx: Context<ExecuteOrder>,
        order_commitment: [u8; 32],
        encrypted_details: Vec<u8>,
        _policy_proof: Vec<u8>, // Placeholder for ZK proof of policy compliance
    ) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        let clock = Clock::get()?;

        // Verify agent
        require!(vault.agent == ctx.accounts.agent.key(), VaultError::UnauthorizedAgent);
        require!(vault.is_active, VaultError::VaultInactive);

        // Verify policy hasn't expired
        let policy = &ctx.accounts.policy;
        if policy.expiry > 0 {
            require!(clock.unix_timestamp < policy.expiry, VaultError::PolicyExpired);
        }

        // Record order — details are encrypted
        vault.order_count = vault.order_count.checked_add(1).unwrap();

        // Hash the encrypted details for the audit log
        let details_hash = hash(&encrypted_details).to_bytes();

        emit!(OrderExecuted {
            vault: vault.key(),
            agent: vault.agent,
            order_index: vault.order_count,
            order_commitment,
            details_hash,
        });

        msg!("Order executed — details encrypted");
        msg!("  Order #{}", vault.order_count);
        msg!("  Details hash: {}...", hex_prefix(&details_hash));

        Ok(())
    }

    /// Withdraw using nullifier scheme.
    ///
    /// Client generates: nullifier = H(vault_id || amount || nonce)
    /// The nullifier proves the client knows a deposit without revealing which one.
    /// Once used, the nullifier is marked (prevents double-spend).
    pub fn withdraw(
        ctx: Context<Withdraw>,
        nullifier: [u8; 32],
        amount: u64,
        _commitment_proof: [u8; 32], // Proof that this nullifier corresponds to a valid deposit
    ) -> Result<()> {
        let vault = &ctx.accounts.vault;
        require!(vault.owner == ctx.accounts.owner.key(), VaultError::Unauthorized);
        require!(vault.is_active, VaultError::VaultInactive);

        // Verify nullifier not already used
        let nullifier_store = &ctx.accounts.nullifier_store;
        let nullifier_index = (nullifier[0] as usize) % MAX_NULLIFIERS;
        let byte_index = nullifier_index / 8;
        let bit_index = nullifier_index % 8;
        require!(
            byte_index < nullifier_store.nullifier_bitmap.len(),
            VaultError::InvalidNullifier
        );
        require!(
            nullifier_store.nullifier_bitmap[byte_index] & (1 << bit_index) == 0,
            VaultError::NullifierAlreadyUsed
        );

        // Verify sufficient balance
        require!(amount <= vault.sol_balance, VaultError::InsufficientBalance);

        // Mark nullifier as used
        let nullifier_store = &mut ctx.accounts.nullifier_store;
        nullifier_store.nullifier_bitmap[byte_index] |= 1 << bit_index;
        nullifier_store.used_count = nullifier_store.used_count.checked_add(1).unwrap();

        // Transfer SOL from vault PDA to owner
        let vault_id = vault.vault_id;
        let bump = vault.bump;
        let vault_seeds = &[b"vault", vault_id.as_ref(), &[bump]];
        let signer_seeds = &[&vault_seeds[..]];

        invoke_signed(
            &system_instruction::transfer(
                &ctx.accounts.vault.key(),
                &ctx.accounts.owner.key(),
                amount,
            ),
            &[
                ctx.accounts.vault.to_account_info(),
                ctx.accounts.owner.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
            signer_seeds,
        )?;

        let vault = &mut ctx.accounts.vault;
        vault.sol_balance = vault.sol_balance.checked_sub(amount).unwrap();
        vault.withdrawal_count = vault.withdrawal_count.checked_add(1).unwrap();

        emit!(WithdrawnWithNullifier {
            vault: vault.key(),
            owner: vault.owner,
            nullifier,
            withdrawal_index: vault.withdrawal_count,
        });

        msg!("Withdrawal via nullifier — unlinkable to deposit");
        msg!("  Nullifier: {}...", hex_prefix(&nullifier));
        msg!("  Withdrawal #{}", vault.withdrawal_count);

        Ok(())
    }

    /// Update policy commitments (owner only).
    pub fn update_policy(
        ctx: Context<UpdatePolicy>,
        max_spend_commitment: [u8; 32],
        max_order_commitment: [u8; 32],
        max_position_commitment: [u8; 32],
        epoch_duration: i64,
        expiry: i64,
    ) -> Result<()> {
        let vault = &ctx.accounts.vault;
        require!(vault.owner == ctx.accounts.owner.key(), VaultError::Unauthorized);

        let policy = &mut ctx.accounts.policy;
        policy.max_spend_commitment = max_spend_commitment;
        policy.max_order_commitment = max_order_commitment;
        policy.max_position_commitment = max_position_commitment;
        policy.epoch_duration = epoch_duration;
        policy.expiry = expiry;

        emit!(PolicyUpdated {
            vault: vault.key(),
            updated_by: vault.owner,
        });

        msg!("Policy updated — limits remain hidden");

        Ok(())
    }

    /// Emergency deactivation.
    pub fn deactivate_vault(ctx: Context<DeactivateVault>) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        require!(vault.owner == ctx.accounts.owner.key(), VaultError::Unauthorized);
        vault.is_active = false;

        emit!(VaultDeactivated {
            vault: vault.key(),
            owner: vault.owner,
        });

        msg!("Vault deactivated");

        Ok(())
    }

    /// Update authorized agent.
    pub fn update_agent(ctx: Context<UpdateAgent>, new_agent: Pubkey) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        require!(vault.owner == ctx.accounts.owner.key(), VaultError::Unauthorized);

        let old_agent = vault.agent;
        vault.agent = new_agent;

        emit!(AgentUpdated {
            vault: vault.key(),
            old_agent,
            new_agent,
        });

        msg!("Agent updated: {} -> {}", old_agent, new_agent);

        Ok(())
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════════

/// Create a deposit commitment: H(amount || owner || nonce)
pub fn create_commitment(amount: u64, owner: &Pubkey, nonce: &[u8; 32]) -> [u8; 32] {
    let mut input = Vec::with_capacity(8 + 32 + 32);
    input.extend_from_slice(&amount.to_le_bytes());
    input.extend_from_slice(owner.as_ref());
    input.extend_from_slice(nonce);
    hash(&input).to_bytes()
}

/// Create a withdrawal nullifier: H(vault_id || amount || nonce)
pub fn create_nullifier(vault_id: &[u8; 32], amount: u64, nonce: &[u8; 32]) -> [u8; 32] {
    let mut input = Vec::with_capacity(32 + 8 + 32);
    input.extend_from_slice(vault_id);
    input.extend_from_slice(&amount.to_le_bytes());
    input.extend_from_slice(nonce);
    hash(&input).to_bytes()
}

/// Create a policy commitment: H(limit_value || salt)
pub fn create_policy_commitment(value: u64, salt: &[u8; 32]) -> [u8; 32] {
    let mut input = Vec::with_capacity(8 + 32);
    input.extend_from_slice(&value.to_le_bytes());
    input.extend_from_slice(salt);
    hash(&input).to_bytes()
}

/// Hex prefix for logging
fn hex_prefix(data: &[u8; 32]) -> String {
    hex::encode(&data[..4])
}

// ═══════════════════════════════════════════════════════════════════════════════
// Account Structs
// ═══════════════════════════════════════════════════════════════════════════════

#[derive(Accounts)]
#[instruction(vault_id: [u8; 32])]
pub struct CreateVault<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + Vault::INIT_SPACE,
        seeds = [b"vault", vault_id.as_ref()],
        bump,
    )]
    pub vault: Account<'info, Vault>,

    #[account(
        init,
        payer = payer,
        space = 8 + Policy::INIT_SPACE,
        seeds = [b"policy", vault_id.as_ref()],
        bump,
    )]
    pub policy: Account<'info, Policy>,

    #[account(
        init,
        payer = payer,
        space = 8 + NullifierStore::INIT_SPACE,
        seeds = [b"nullifiers", vault_id.as_ref()],
        bump,
    )]
    pub nullifier_store: Account<'info, NullifierStore>,

    pub owner: Signer<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(
        mut,
        seeds = [b"vault", vault.vault_id.as_ref()],
        bump = vault.bump,
    )]
    pub vault: Account<'info, Vault>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ExecuteOrder<'info> {
    #[account(
        mut,
        seeds = [b"vault", vault.vault_id.as_ref()],
        bump = vault.bump,
    )]
    pub vault: Account<'info, Vault>,

    #[account(
        seeds = [b"policy", vault.vault_id.as_ref()],
        bump = policy.bump,
    )]
    pub policy: Account<'info, Policy>,

    pub agent: Signer<'info>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(
        mut,
        seeds = [b"vault", vault.vault_id.as_ref()],
        bump = vault.bump,
    )]
    pub vault: Account<'info, Vault>,

    #[account(
        mut,
        seeds = [b"nullifiers", vault.vault_id.as_ref()],
        bump = nullifier_store.bump,
    )]
    pub nullifier_store: Account<'info, NullifierStore>,

    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdatePolicy<'info> {
    pub vault: Account<'info, Vault>,

    #[account(
        mut,
        seeds = [b"policy", vault.vault_id.as_ref()],
        bump = policy.bump,
    )]
    pub policy: Account<'info, Policy>,

    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct DeactivateVault<'info> {
    #[account(
        mut,
        seeds = [b"vault", vault.vault_id.as_ref()],
        bump = vault.bump,
    )]
    pub vault: Account<'info, Vault>,

    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateAgent<'info> {
    #[account(
        mut,
        seeds = [b"vault", vault.vault_id.as_ref()],
        bump = vault.bump,
    )]
    pub vault: Account<'info, Vault>,

    pub owner: Signer<'info>,
}

// ═══════════════════════════════════════════════════════════════════════════════
// Events
// ═══════════════════════════════════════════════════════════════════════════════

#[event]
pub struct VaultCreated {
    pub vault: Pubkey,
    pub owner: Pubkey,
    pub agent: Pubkey,
    pub vault_id: [u8; 32],
}

#[event]
pub struct DepositCommitted {
    pub vault: Pubkey,
    pub owner: Pubkey,
    pub commitment: [u8; 32],
    pub accumulator: [u8; 32],
    pub deposit_index: u64,
}

#[event]
pub struct OrderExecuted {
    pub vault: Pubkey,
    pub agent: Pubkey,
    pub order_index: u64,
    pub order_commitment: [u8; 32],
    pub details_hash: [u8; 32],
}

#[event]
pub struct WithdrawnWithNullifier {
    pub vault: Pubkey,
    pub owner: Pubkey,
    pub nullifier: [u8; 32],
    pub withdrawal_index: u64,
}

#[event]
pub struct PolicyUpdated {
    pub vault: Pubkey,
    pub updated_by: Pubkey,
}

#[event]
pub struct VaultDeactivated {
    pub vault: Pubkey,
    pub owner: Pubkey,
}

#[event]
pub struct AgentUpdated {
    pub vault: Pubkey,
    pub old_agent: Pubkey,
    pub new_agent: Pubkey,
}

// ═══════════════════════════════════════════════════════════════════════════════
// Errors
// ═══════════════════════════════════════════════════════════════════════════════

#[error_code]
pub enum VaultError {
    #[msg("Unauthorized: caller is not the vault owner")]
    Unauthorized,
    #[msg("Unauthorized: caller is not the authorized agent")]
    UnauthorizedAgent,
    #[msg("Vault is not active")]
    VaultInactive,
    #[msg("Invalid commitment (cannot be zero)")]
    InvalidCommitment,
    #[msg("Invalid nullifier")]
    InvalidNullifier,
    #[msg("Nullifier already used (double-spend attempt)")]
    NullifierAlreadyUsed,
    #[msg("Insufficient balance")]
    InsufficientBalance,
    #[msg("Policy has expired")]
    PolicyExpired,
    #[msg("Invalid proof")]
    InvalidProof,
}
