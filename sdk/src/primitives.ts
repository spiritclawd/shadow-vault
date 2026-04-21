/**
 * Shadow Vault — Privacy Primitives
 * 
 * Core cryptographic functions for the commitment/nullifier scheme.
 * All computation happens client-side. Nothing leaks to the server.
 */

import { createHash, randomBytes } from 'crypto';
import type { PublicKey } from '@solana/web3.js';

/** SHA-256 hash */
export function sha256(data: Uint8Array): Uint8Array {
  return new Uint8Array(createHash('sha256').update(data).digest());
}

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
export function createCommitment(
  amount: bigint,
  owner: PublicKey,
  nonce: Uint8Array
): Uint8Array {
  if (nonce.length !== 32) throw new Error('Nonce must be 32 bytes');

  const buf = new Uint8Array(8 + 32 + 32);
  const view = new DataView(buf.buffer);
  view.setBigUint64(0, amount, true); // little-endian
  buf.set(owner.toBytes(), 8);
  buf.set(nonce, 40);
  return sha256(buf);
}

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
export function createNullifier(
  vaultId: Uint8Array,
  amount: bigint,
  nonce: Uint8Array
): Uint8Array {
  if (vaultId.length !== 32) throw new Error('Vault ID must be 32 bytes');
  if (nonce.length !== 32) throw new Error('Nonce must be 32 bytes');

  const buf = new Uint8Array(32 + 8 + 32);
  const view = new DataView(buf.buffer);
  buf.set(vaultId, 0);
  view.setBigUint64(32, amount, true);
  buf.set(nonce, 40);
  return sha256(buf);
}

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
export function createPolicyCommitment(
  value: bigint,
  salt: Uint8Array
): Uint8Array {
  if (salt.length !== 32) throw new Error('Salt must be 32 bytes');

  const buf = new Uint8Array(8 + 32);
  const view = new DataView(buf.buffer);
  view.setBigUint64(0, value, true);
  buf.set(salt, 8);
  return sha256(buf);
}

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
export function encryptOrder(
  details: Record<string, unknown>,
  key: Uint8Array
): { encrypted: Uint8Array; hash: Uint8Array } {
  const plaintext = new TextEncoder().encode(JSON.stringify(details));
  const encrypted = new Uint8Array(plaintext.length);

  for (let i = 0; i < plaintext.length; i++) {
    encrypted[i] = plaintext[i] ^ key[i % key.length];
  }

  return { encrypted, hash: sha256(encrypted) };
}

/**
 * Decrypt order details (owner only).
 */
export function decryptOrder(
  encrypted: Uint8Array,
  key: Uint8Array
): Record<string, unknown> {
  const decrypted = new Uint8Array(encrypted.length);
  for (let i = 0; i < encrypted.length; i++) {
    decrypted[i] = encrypted[i] ^ key[i % key.length];
  }
  return JSON.parse(new TextDecoder().decode(decrypted));
}

/**
 * Generate a cryptographically secure random nonce.
 */
export function generateNonce(): Uint8Array {
  return new Uint8Array(randomBytes(32));
}

/**
 * Update the commitment accumulator: acc = H(acc || new_commitment)
 * 
 * Creates a chain of all deposit commitments.
 * Can be used to prove membership without revealing details.
 */
export function updateAccumulator(
  currentAccumulator: Uint8Array,
  newCommitment: Uint8Array
): Uint8Array {
  const buf = new Uint8Array(64);
  buf.set(currentAccumulator, 0);
  buf.set(newCommitment, 32);
  return sha256(buf);
}

// ═══════════════════════════════════════════════════════════════
// Utilities
// ═══════════════════════════════════════════════════════════════

/** Convert bytes to hex string */
export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Convert hex string to bytes */
export function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

/** Convert lamports to SOL string */
export function lamportsToSol(lamports: bigint): string {
  return (Number(lamports) / 1_000_000_000).toFixed(9);
}

/** Convert SOL to lamports */
export function solToLamports(sol: number): bigint {
  return BigInt(Math.floor(sol * 1_000_000_000));
}
