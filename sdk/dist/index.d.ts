import { PublicKey, Keypair } from '@solana/web3.js';

/**
 * Shadow Vault — Privacy Primitives
 *
 * Core cryptographic functions for the commitment/nullifier scheme.
 * All computation happens client-side. Nothing leaks to the server.
 */

/** SHA-256 hash */
declare function sha256(data: Uint8Array): Uint8Array;
/**
 * Create a deposit commitment: H(amount || owner || nonce)
 *
 * The amount is HIDDEN — only this hash goes on-chain.
 * The owner can later prove they made a deposit without revealing the amount.
 *
 * @param amount - Deposit amount in lamports
 * @param owner - Owner's public key
 * @param nonce - Random 32-byte nonce (MUST be unique per deposit)
 * @returns 32-byte commitment hash
 */
declare function createCommitment(amount: bigint, owner: PublicKey, nonce: Uint8Array): Uint8Array;
/**
 * Create a withdrawal nullifier: H(vault_id || amount || nonce)
 *
 * Prevents double-spend. Each (vault_id, amount, nonce) combo is unique.
 * Once used, that nullifier is marked on-chain and can't be reused.
 * The nullifier is UNLINKABLE to the deposit commitment.
 *
 * @param vaultId - 32-byte vault identifier
 * @param amount - Deposit amount in lamports
 * @param nonce - Same nonce used in the commitment
 * @returns 32-byte nullifier hash
 */
declare function createNullifier(vaultId: Uint8Array, amount: bigint, nonce: Uint8Array): Uint8Array;
/**
 * Create a policy commitment: H(value || salt)
 *
 * Hides the actual limit value on-chain.
 * Only the owner knows the real limit.
 *
 * @param value - Policy limit value (e.g., max spend per epoch)
 * @param salt - Random 32-byte salt
 * @returns 32-byte commitment hash
 */
declare function createPolicyCommitment(value: bigint, salt: Uint8Array): Uint8Array;
/**
 * Encrypt order details with a symmetric key.
 *
 * In production, use AES-256-GCM with the owner's derived key.
 * This demo uses XOR for simplicity — replace with real encryption for production.
 *
 * @param details - Order details object
 * @param key - 32-byte symmetric key
 * @returns Object with encrypted bytes and hash
 */
declare function encryptOrder(details: Record<string, unknown>, key: Uint8Array): {
    encrypted: Uint8Array;
    hash: Uint8Array;
};
/**
 * Decrypt order details (owner only).
 */
declare function decryptOrder(encrypted: Uint8Array, key: Uint8Array): Record<string, unknown>;
/**
 * Generate a cryptographically secure random nonce.
 */
declare function generateNonce(): Uint8Array;
/**
 * Update the commitment accumulator: acc = H(acc || new_commitment)
 *
 * Creates a chain of all deposit commitments.
 * Can be used to prove membership without revealing details.
 */
declare function updateAccumulator(currentAccumulator: Uint8Array, newCommitment: Uint8Array): Uint8Array;
/** Convert bytes to hex string */
declare function toHex(bytes: Uint8Array): string;
/** Convert hex string to bytes */
declare function fromHex(hex: string): Uint8Array;
/** Convert lamports to SOL string */
declare function lamportsToSol(lamports: bigint): string;
/** Convert SOL to lamports */
declare function solToLamports(sol: number): bigint;

/**
 * Shadow Vault Client
 *
 * High-level SDK for interacting with the Shadow Vault program on Solana.
 * Handles commitment generation, deposit/withdraw transactions, and order execution.
 */

interface ShadowVaultConfig {
    /** Solana RPC endpoint */
    rpcUrl?: string;
    /** Program ID */
    programId?: string | PublicKey;
    /** Commitment level for transactions */
    commitment?: 'processed' | 'confirmed' | 'finalized';
}
interface DepositParams {
    /** Amount in SOL (will be converted to lamports) */
    amountSol: number;
    /** Optional: provide your own nonce (32 bytes). Generated if not provided. */
    nonce?: Uint8Array;
}
interface DepositResult {
    /** Transaction signature */
    signature: string;
    /** Commitment hash (what's stored on-chain) */
    commitment: Uint8Array;
    /** Nonce used (SAVE THIS — needed for withdrawal) */
    nonce: Uint8Array;
    /** Amount in lamports */
    amountLamports: bigint;
    /** Solana Explorer link */
    explorerUrl: string;
}
interface WithdrawParams {
    /** Vault ID used during creation */
    vaultId: Uint8Array;
    /** Amount to withdraw in SOL */
    amountSol: number;
    /** Nonce from the original deposit */
    nonce: Uint8Array;
}
interface WithdrawResult {
    signature: string;
    nullifier: Uint8Array;
    explorerUrl: string;
}
interface OrderParams {
    /** Order details (pair, side, amount, price, etc.) */
    details: Record<string, unknown>;
    /** Encryption key (32 bytes). Generate once per vault and reuse. */
    encryptionKey: Uint8Array;
}
interface OrderResult {
    signature: string;
    orderHash: Uint8Array;
    explorerUrl: string;
}
interface VaultInfo {
    address: PublicKey;
    balance: number;
    exists: boolean;
    explorerUrl: string;
}
interface DepositReceipt {
    commitment: string;
    nonce: string;
    amountLamports: string;
    timestamp: number;
}
declare class ShadowVaultClient {
    private owner;
    private connection;
    private programId;
    constructor(owner: Keypair, config?: ShadowVaultConfig);
    get publicKey(): PublicKey;
    get program(): PublicKey;
    /**
     * Derive vault PDA from a vault ID.
     */
    getVaultPDA(vaultId: Uint8Array): [PublicKey, number];
    /**
     * Derive nullifier store PDA from vault address.
     */
    getNullifierStorePDA(vault: PublicKey): [PublicKey, number];
    /**
     * Derive policy PDA from vault address.
     */
    getPolicyPDA(vault: PublicKey): [PublicKey, number];
    /**
     * Get owner's SOL balance.
     */
    getBalance(): Promise<number>;
    /**
     * Get vault info (balance, existence, explorer link).
     */
    getVaultInfo(vaultId: Uint8Array): Promise<VaultInfo>;
    /**
     * Get recent transactions for the owner.
     */
    getRecentTransactions(limit?: number): Promise<{
        signature: string;
        slot: number;
        blockTime: Date | null;
        status: "confirmed" | "failed";
        explorerUrl: string;
    }[]>;
    /**
     * Deposit SOL with a commitment.
     *
     * The amount is HIDDEN on-chain. Only the commitment hash is visible.
     *
     * @returns DepositResult with commitment, nonce, and tx signature.
     *          **SAVE THE NONCE** — you need it to withdraw.
     */
    deposit(params: DepositParams): Promise<DepositResult>;
    /**
     * Withdraw SOL using a nullifier.
     *
     * The withdrawal is UNLINKABLE to any specific deposit.
     * The nullifier prevents double-spend.
     */
    withdraw(params: WithdrawParams): Promise<WithdrawResult>;
    /**
     * Execute an encrypted order.
     *
     * Order details are encrypted client-side.
     * Only the hash of the encrypted data goes on-chain.
     * The owner can decrypt later and share with regulators if needed.
     */
    executeOrder(params: OrderParams): Promise<OrderResult>;
    /**
     * Run a full privacy demo: deposit → order → withdraw.
     *
     * Returns all results so you can verify the privacy guarantees.
     */
    runDemo(amountSol?: number): Promise<{
        deposit: DepositResult;
        order: OrderResult;
        vaultInfo: VaultInfo;
        summary: string[];
    }>;
}

/**
 * @shadow-vault/solana
 *
 * Privacy-preserving vault SDK for AI agents on Solana.
 *
 * @example
 * ```typescript
 * import { ShadowVaultClient, generateNonce } from '@shadow-vault/solana';
 * import { Keypair } from '@solana/web3.js';
 *
 * const owner = Keypair.generate(); // or load your keypair
 * const vault = new ShadowVaultClient(owner);
 *
 * // Deposit with hidden amount
 * const dep = await vault.deposit({ amountSol: 0.1 });
 * // Only the commitment hash is visible on-chain!
 *
 * // Execute encrypted order
 * await vault.executeOrder({
 *   details: { pair: 'SOL/USDC', side: 'BUY', amount: 0.05 },
 *   encryptionKey: generateNonce(),
 * });
 *
 * // Withdraw with nullifier (unlinkable to deposit)
 * const vaultId = dep.commitment.slice(0, 32);
 * await vault.withdraw({ vaultId, amountSol: 0.1, nonce: dep.nonce });
 * ```
 */

declare const PROGRAM_ID = "7NNxu4Sa4qwytUogrka8m398mo3hfNbkAK7TWbSG8PvW";
declare const DEVNET_RPC = "https://api.devnet.solana.com";
declare const VERSION = "0.2.0";

export { DEVNET_RPC, type DepositParams, type DepositReceipt, type DepositResult, type OrderParams, type OrderResult, PROGRAM_ID, ShadowVaultClient, type ShadowVaultConfig, VERSION, type VaultInfo, type WithdrawParams, type WithdrawResult, createCommitment, createNullifier, createPolicyCommitment, decryptOrder, encryptOrder, fromHex, generateNonce, lamportsToSol, sha256, solToLamports, toHex, updateAccumulator };
