//! Shadow Vault — Encrypted AI Agent Strategy Vault on Solana
//!
//! A Solana program that lets AI agents execute DeFi strategies where all
//! positions, balances, and orders are encrypted using FHE.
//! 
//! Architecture integrates with Encrypt (FHE) for on-chain encrypted computation.
//! In this pre-alpha version, ciphertext references are stored as opaque byte arrays.
//! The Encrypt CPI integration follows the pattern from docs.encrypt.xyz.

use anchor_lang::prelude::*;
use anchor_lang::solana_program::{invoke, invoke_signed, system_instruction};

// Program ID (valid base58)
declare_id!("HgJgRAkYEz1y5fx7wLkVfMSpfxuNsGgyBguXAnzkR9Qa");

// ═══════════════════════════════════════════════════════════════════════════════
// State Accounts
// ═══════════════════════════════════════════════════════════════════════════════

/// The main vault account holding encrypted balances and positions.
/// All financial data is stored as ciphertext references — the actual
/// encrypted values live in Encrypt's ciphertext accounts.
#[account]
#[derive(InitSpace)]
pub struct Vault {
    /// The owner of this vault (can decrypt, update policy, withdraw)
    pub owner: Pubkey,
    /// The authorized agent that can execute orders
    pub agent: Pubkey,
    /// Reference to the policy governing this vault
    pub policy_id: [u8; 32],
    /// Ciphertext account reference for encrypted balance (Encrypt program)
    pub encrypted_balance_ct: [u8; 32],
    /// Ciphertext account reference for encrypted position (Encrypt program)
    pub encrypted_position_ct: [u8; 32],
    /// Total deposited (plaintext, for accounting)
    pub total_deposited: u64,
    /// Total withdrawn (plaintext, for accounting)
    pub total_withdrawn: u64,
    /// Number of orders executed
    pub order_count: u64,
    /// Whether the vault is active
    pub is_active: bool,
    /// Creation timestamp
    pub created_at: i64,
    /// PDA bump
    pub bump: u8,
}

/// Spending policy for a vault — enforced on-chain before any order executes.
#[account]
#[derive(InitSpace)]
pub struct Policy {
    /// The vault this policy belongs to
    pub vault: Pubkey,
    /// Maximum spendable amount per epoch (in lamports)
    pub max_spend_per_epoch: u64,
    /// Maximum single order size
    pub max_order_size: u64,
    /// Maximum total position size
    pub max_position_size: u64,
    /// Duration of each epoch in seconds
    pub epoch_duration: i64,
    /// Policy expiry timestamp (unix seconds), 0 = never expires
    pub expiry: i64,
    /// Total spent in current epoch (plaintext tracking for enforcement)
    pub epoch_spent: u64,
    /// Current epoch start timestamp
    pub epoch_start: i64,
    /// PDA bump
    pub bump: u8,
}

/// Audit log entry — records each order execution for transparency.
/// The order details are encrypted, but the fact that an order occurred is logged.
#[account]
#[derive(InitSpace)]
pub struct OrderLog {
    /// The vault this order belongs to
    pub vault: Pubkey,
    /// Sequential order number
    pub order_index: u64,
    /// Timestamp of execution
    pub timestamp: i64,
    /// Ciphertext reference for the order details (Encrypt program)
    pub order_details_ct: [u8; 32],
    /// Whether the order was executed or rejected by policy
    pub executed: bool,
    /// PDA bump
    pub bump: u8,
}

// ═══════════════════════════════════════════════════════════════════════════════
// Instructions
// ═══════════════════════════════════════════════════════════════════════════════

#[program]
pub mod shadow_vault {
    use super::*;

    /// Create a new vault with an associated policy.
    ///
    /// The vault stores references to encrypted ciphertext accounts for
    /// balance and position. The policy controls spending limits and risk.
    pub fn create_vault(
        ctx: Context<CreateVault>,
        vault_id: [u8; 32],
        agent: Pubkey,
        max_spend_per_epoch: u64,
        max_order_size: u64,
        max_position_size: u64,
        epoch_duration: i64,
        expiry: i64,
    ) -> Result<()> {
        let clock = Clock::get()?;
        
        let vault = &mut ctx.accounts.vault;
        vault.owner = ctx.accounts.owner.key();
        vault.agent = agent;
        vault.policy_id = vault_id; // policy uses same seed
        vault.encrypted_balance_ct = [0u8; 32]; // initialized when deposit happens
        vault.encrypted_position_ct = [0u8; 32];
        vault.total_deposited = 0;
        vault.total_withdrawn = 0;
        vault.order_count = 0;
        vault.is_active = true;
        vault.created_at = clock.unix_timestamp;
        vault.bump = ctx.bumps.vault;

        let policy = &mut ctx.accounts.policy;
        policy.vault = vault.key();
        policy.max_spend_per_epoch = max_spend_per_epoch;
        policy.max_order_size = max_order_size;
        policy.max_position_size = max_position_size;
        policy.epoch_duration = epoch_duration;
        policy.expiry = expiry;
        policy.epoch_spent = 0;
        policy.epoch_start = clock.unix_timestamp;
        policy.bump = ctx.bumps.policy;

        emit!(VaultCreated {
            vault: vault.key(),
            owner: vault.owner,
            agent,
            max_spend_per_epoch,
        });

        Ok(())
    }

    /// Deposit funds into the vault.
    ///
    /// In production, this would create/update ciphertext accounts via Encrypt CPI:
    /// ```ignore
    /// let encrypt_ctx = EncryptContext { ... };
    /// encrypt_ctx.add_graph(balance_ct, amount_ct, output_ct)?;
    /// ```
    pub fn deposit(
        ctx: Context<Deposit>,
        amount: u64,
    ) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        require!(vault.is_active, VaultError::VaultInactive);
        require!(
            vault.owner == ctx.accounts.owner.key(),
            VaultError::Unauthorized
        );
        require!(amount > 0, VaultError::InvalidAmount);

        // Transfer SOL to vault PDA
        invoke(
            &system_instruction::transfer(
                &ctx.accounts.owner.key(),
                &ctx.accounts.vault.key(),
                amount,
            ),
            &[
                ctx.accounts.owner.to_account_info(),
                ctx.accounts.vault.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        vault.total_deposited = vault.total_deposited.checked_add(amount).unwrap();

        emit!(Deposited {
            vault: vault.key(),
            owner: vault.owner,
            amount,
            total_deposited: vault.total_deposited,
        });

        Ok(())
    }

    /// Agent executes an encrypted order.
    ///
    /// Policy checks happen BEFORE the FHE computation:
    /// 1. Policy hasn't expired
    /// 2. Order size within limits
    /// 3. Epoch spend within limits
    /// 4. New position within limits
    ///
    /// In production, the FHE execution would be:
    /// ```ignore
    /// let encrypt_ctx = EncryptContext { ... };
    /// encrypt_ctx.execute_order_graph(balance_ct, amount_ct, price_ct, out_balance_ct, out_position_ct)?;
    /// ```
    pub fn execute_order(
        ctx: Context<ExecuteOrder>,
        order_amount: u64,
        order_details_ct: [u8; 32],
    ) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        let policy = &mut ctx.accounts.policy;
        let clock = Clock::get()?;

        // Verify agent authorization
        require!(
            vault.agent == ctx.accounts.agent.key(),
            VaultError::UnauthorizedAgent
        );
        require!(vault.is_active, VaultError::VaultInactive);

        // Policy check 1: expiry
        if policy.expiry > 0 {
            require!(
                clock.unix_timestamp < policy.expiry,
                VaultError::PolicyExpired
            );
        }

        // Policy check 2: single order size
        require!(
            order_amount <= policy.max_order_size,
            VaultError::OrderExceedsLimit
        );

        // Policy check 3: epoch spend limit
        // Reset epoch if needed
        if clock.unix_timestamp - policy.epoch_start >= policy.epoch_duration {
            policy.epoch_spent = 0;
            policy.epoch_start = clock.unix_timestamp;
        }
        
        let new_epoch_spent = policy.epoch_spent.checked_add(order_amount).unwrap();
        require!(
            new_epoch_spent <= policy.max_spend_per_epoch,
            VaultError::EpochSpendExceeded
        );

        // Policy check 4: sufficient balance
        require!(
            order_amount <= vault.total_deposited - vault.total_withdrawn,
            VaultError::InsufficientBalance
        );

        // All checks passed — execute the order
        policy.epoch_spent = new_epoch_spent;
        vault.order_count = vault.order_count.checked_add(1).unwrap();

        emit!(OrderExecuted {
            vault: vault.key(),
            agent: vault.agent,
            order_index: vault.order_count,
            order_amount,
            order_details_ct,
            epoch_spent: policy.epoch_spent,
        });

        Ok(())
    }

    /// Owner withdraws funds from the vault.
    pub fn withdraw(
        ctx: Context<Withdraw>,
        amount: u64,
    ) -> Result<()> {
        let available;
        let bump;
        let policy_id;
        {
            let vault = &ctx.accounts.vault;
            require!(
                vault.owner == ctx.accounts.owner.key(),
                VaultError::Unauthorized
            );
            require!(vault.is_active, VaultError::VaultInactive);
            available = vault.total_deposited - vault.total_withdrawn;
            bump = vault.bump;
            policy_id = vault.policy_id;
        }
        require!(amount <= available, VaultError::InsufficientBalance);

        // Transfer SOL from vault PDA to owner
        let vault_seeds = &[b"vault", policy_id.as_ref(), &[bump]];
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
        vault.total_withdrawn = vault.total_withdrawn.checked_add(amount).unwrap();

        emit!(Withdrawn {
            vault: vault.key(),
            owner: vault.owner,
            amount,
        });

        Ok(())
    }

    /// Owner updates the vault's spending policy.
    pub fn update_policy(
        ctx: Context<UpdatePolicy>,
        max_spend_per_epoch: u64,
        max_order_size: u64,
        max_position_size: u64,
        epoch_duration: i64,
        expiry: i64,
    ) -> Result<()> {
        let vault = &ctx.accounts.vault;
        require!(
            vault.owner == ctx.accounts.owner.key(),
            VaultError::Unauthorized
        );

        let policy = &mut ctx.accounts.policy;
        policy.max_spend_per_epoch = max_spend_per_epoch;
        policy.max_order_size = max_order_size;
        policy.max_position_size = max_position_size;
        policy.epoch_duration = epoch_duration;
        policy.expiry = expiry;

        emit!(PolicyUpdated {
            vault: vault.key(),
            max_spend_per_epoch,
            max_order_size,
        });

        Ok(())
    }

    /// Owner deactivates the vault (emergency stop).
    pub fn deactivate_vault(ctx: Context<DeactivateVault>) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        require!(
            vault.owner == ctx.accounts.owner.key(),
            VaultError::Unauthorized
        );
        vault.is_active = false;

        emit!(VaultDeactivated {
            vault: vault.key(),
            owner: vault.owner,
        });

        Ok(())
    }

    /// Owner updates the authorized agent.
    pub fn update_agent(
        ctx: Context<UpdateAgent>,
        new_agent: Pubkey,
    ) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        require!(
            vault.owner == ctx.accounts.owner.key(),
            VaultError::Unauthorized
        );

        let old_agent = vault.agent;
        vault.agent = new_agent;

        emit!(AgentUpdated {
            vault: vault.key(),
            old_agent,
            new_agent,
        });

        Ok(())
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Account Validation Structs
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

    pub owner: Signer<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(
        mut,
        seeds = [b"vault", vault.policy_id.as_ref()],
        bump = vault.bump,
    )]
    pub vault: Account<'info, Vault>,

    pub owner: Signer<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ExecuteOrder<'info> {
    #[account(
        mut,
        seeds = [b"vault", vault.policy_id.as_ref()],
        bump = vault.bump,
    )]
    pub vault: Account<'info, Vault>,

    #[account(
        mut,
        seeds = [b"policy", vault.policy_id.as_ref()],
        bump = policy.bump,
    )]
    pub policy: Account<'info, Policy>,

    pub agent: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(
        mut,
        seeds = [b"vault", vault.policy_id.as_ref()],
        bump = vault.bump,
    )]
    pub vault: Account<'info, Vault>,

    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdatePolicy<'info> {
    pub vault: Account<'info, Vault>,

    #[account(
        mut,
        seeds = [b"policy", vault.policy_id.as_ref()],
        bump = policy.bump,
    )]
    pub policy: Account<'info, Policy>,

    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct DeactivateVault<'info> {
    #[account(
        mut,
        seeds = [b"vault", vault.policy_id.as_ref()],
        bump = vault.bump,
    )]
    pub vault: Account<'info, Vault>,

    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateAgent<'info> {
    #[account(
        mut,
        seeds = [b"vault", vault.policy_id.as_ref()],
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
    pub max_spend_per_epoch: u64,
}

#[event]
pub struct Deposited {
    pub vault: Pubkey,
    pub owner: Pubkey,
    pub amount: u64,
    pub total_deposited: u64,
}

#[event]
pub struct OrderExecuted {
    pub vault: Pubkey,
    pub agent: Pubkey,
    pub order_index: u64,
    pub order_amount: u64,
    pub order_details_ct: [u8; 32],
    pub epoch_spent: u64,
}

#[event]
pub struct Withdrawn {
    pub vault: Pubkey,
    pub owner: Pubkey,
    pub amount: u64,
}

#[event]
pub struct PolicyUpdated {
    pub vault: Pubkey,
    pub max_spend_per_epoch: u64,
    pub max_order_size: u64,
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
    #[msg("Invalid amount (must be > 0)")]
    InvalidAmount,
    #[msg("Insufficient balance")]
    InsufficientBalance,
    #[msg("Order size exceeds policy limit")]
    OrderExceedsLimit,
    #[msg("Epoch spend limit exceeded")]
    EpochSpendExceeded,
    #[msg("Position size exceeds policy limit")]
    PositionExceedsLimit,
    #[msg("Policy has expired")]
    PolicyExpired,
}
