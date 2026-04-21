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

// Client
export { ShadowVaultClient } from './client.js';
export type {
  ShadowVaultConfig,
  DepositParams,
  DepositResult,
  WithdrawParams,
  WithdrawResult,
  OrderParams,
  OrderResult,
  VaultInfo,
  DepositReceipt,
} from './client.js';

// Privacy Primitives
export {
  createCommitment,
  createNullifier,
  createPolicyCommitment,
  encryptOrder,
  decryptOrder,
  generateNonce,
  updateAccumulator,
  sha256,
  toHex,
  fromHex,
  lamportsToSol,
  solToLamports,
} from './primitives.js';

// Constants
export const PROGRAM_ID = '7NNxu4Sa4qwytUogrka8m398mo3hfNbkAK7TWbSG8PvW';
export const DEVNET_RPC = 'https://api.devnet.solana.com';
export const VERSION = '0.2.0';
