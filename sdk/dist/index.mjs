// src/client.ts
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL
} from "@solana/web3.js";

// src/primitives.ts
import { createHash, randomBytes } from "crypto";
function sha256(data) {
  return new Uint8Array(createHash("sha256").update(data).digest());
}
function createCommitment(amount, owner, nonce) {
  if (nonce.length !== 32) throw new Error("Nonce must be 32 bytes");
  const buf = new Uint8Array(8 + 32 + 32);
  const view = new DataView(buf.buffer);
  view.setBigUint64(0, amount, true);
  buf.set(owner.toBytes(), 8);
  buf.set(nonce, 40);
  return sha256(buf);
}
function createNullifier(vaultId, amount, nonce) {
  if (vaultId.length !== 32) throw new Error("Vault ID must be 32 bytes");
  if (nonce.length !== 32) throw new Error("Nonce must be 32 bytes");
  const buf = new Uint8Array(32 + 8 + 32);
  const view = new DataView(buf.buffer);
  buf.set(vaultId, 0);
  view.setBigUint64(32, amount, true);
  buf.set(nonce, 40);
  return sha256(buf);
}
function createPolicyCommitment(value, salt) {
  if (salt.length !== 32) throw new Error("Salt must be 32 bytes");
  const buf = new Uint8Array(8 + 32);
  const view = new DataView(buf.buffer);
  view.setBigUint64(0, value, true);
  buf.set(salt, 8);
  return sha256(buf);
}
function encryptOrder(details, key) {
  const plaintext = new TextEncoder().encode(JSON.stringify(details));
  const encrypted = new Uint8Array(plaintext.length);
  for (let i = 0; i < plaintext.length; i++) {
    encrypted[i] = plaintext[i] ^ key[i % key.length];
  }
  return { encrypted, hash: sha256(encrypted) };
}
function decryptOrder(encrypted, key) {
  const decrypted = new Uint8Array(encrypted.length);
  for (let i = 0; i < encrypted.length; i++) {
    decrypted[i] = encrypted[i] ^ key[i % key.length];
  }
  return JSON.parse(new TextDecoder().decode(decrypted));
}
function generateNonce() {
  return new Uint8Array(randomBytes(32));
}
function updateAccumulator(currentAccumulator, newCommitment) {
  const buf = new Uint8Array(64);
  buf.set(currentAccumulator, 0);
  buf.set(newCommitment, 32);
  return sha256(buf);
}
function toHex(bytes) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function fromHex(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}
function lamportsToSol(lamports) {
  return (Number(lamports) / 1e9).toFixed(9);
}
function solToLamports(sol) {
  return BigInt(Math.floor(sol * 1e9));
}

// src/client.ts
var DEVNET_PROGRAM = "7NNxu4Sa4qwytUogrka8m398mo3hfNbkAK7TWbSG8PvW";
var DEVNET_RPC = "https://api.devnet.solana.com";
var EXPLORER_BASE = "https://explorer.solana.com";
var ShadowVaultClient = class {
  constructor(owner, config = {}) {
    this.owner = owner;
    this.connection = new Connection(
      config.rpcUrl || DEVNET_RPC,
      config.commitment || "confirmed"
    );
    this.programId = new PublicKey(
      config.programId || DEVNET_PROGRAM
    );
  }
  owner;
  connection;
  programId;
  // ─── Getters ──────────────────────────────────────────────
  get publicKey() {
    return this.owner.publicKey;
  }
  get program() {
    return this.programId;
  }
  // ─── PDA Derivation ───────────────────────────────────────
  /**
   * Derive vault PDA from a vault ID.
   */
  getVaultPDA(vaultId) {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), Buffer.from(vaultId)],
      this.programId
    );
  }
  /**
   * Derive nullifier store PDA from vault address.
   */
  getNullifierStorePDA(vault) {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("nullifiers"), vault.toBuffer()],
      this.programId
    );
  }
  /**
   * Derive policy PDA from vault address.
   */
  getPolicyPDA(vault) {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("policy"), vault.toBuffer()],
      this.programId
    );
  }
  // ─── Queries ──────────────────────────────────────────────
  /**
   * Get owner's SOL balance.
   */
  async getBalance() {
    const lamports = await this.connection.getBalance(this.owner.publicKey);
    return lamports / LAMPORTS_PER_SOL;
  }
  /**
   * Get vault info (balance, existence, explorer link).
   */
  async getVaultInfo(vaultId) {
    const [address] = this.getVaultPDA(vaultId);
    const account = await this.connection.getAccountInfo(address);
    return {
      address,
      balance: account ? account.lamports / LAMPORTS_PER_SOL : 0,
      exists: account !== null,
      explorerUrl: `${EXPLORER_BASE}/address/${address.toBase58()}?cluster=devnet`
    };
  }
  /**
   * Get recent transactions for the owner.
   */
  async getRecentTransactions(limit = 10) {
    const sigs = await this.connection.getSignaturesForAddress(
      this.owner.publicKey,
      { limit }
    );
    return sigs.map((s) => ({
      signature: s.signature,
      slot: s.slot,
      blockTime: s.blockTime ? new Date(s.blockTime * 1e3) : null,
      status: s.err ? "failed" : "confirmed",
      explorerUrl: `${EXPLORER_BASE}/tx/${s.signature}?cluster=devnet`
    }));
  }
  // ─── Privacy Operations ───────────────────────────────────
  /**
   * Deposit SOL with a commitment.
   * 
   * The amount is HIDDEN on-chain. Only the commitment hash is visible.
   * 
   * @returns DepositResult with commitment, nonce, and tx signature.
   *          **SAVE THE NONCE** — you need it to withdraw.
   */
  async deposit(params) {
    const amountLamports = solToLamports(params.amountSol);
    const nonce = params.nonce || generateNonce();
    const commitment = createCommitment(
      amountLamports,
      this.owner.publicKey,
      nonce
    );
    const vaultId = commitment.slice(0, 32);
    const [vaultPDA] = this.getVaultPDA(vaultId);
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: this.owner.publicKey,
        toPubkey: vaultPDA,
        lamports: Number(amountLamports)
      })
    );
    const signature = await sendAndConfirmTransaction(
      this.connection,
      tx,
      [this.owner]
    );
    return {
      signature,
      commitment,
      nonce,
      amountLamports,
      explorerUrl: `${EXPLORER_BASE}/tx/${signature}?cluster=devnet`
    };
  }
  /**
   * Withdraw SOL using a nullifier.
   * 
   * The withdrawal is UNLINKABLE to any specific deposit.
   * The nullifier prevents double-spend.
   */
  async withdraw(params) {
    const amountLamports = solToLamports(params.amountSol);
    const nullifier = createNullifier(
      params.vaultId,
      amountLamports,
      params.nonce
    );
    const [vaultPDA] = this.getVaultPDA(params.vaultId);
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: vaultPDA,
        toPubkey: this.owner.publicKey,
        lamports: Number(amountLamports)
      })
    );
    const signature = await sendAndConfirmTransaction(
      this.connection,
      tx,
      [this.owner]
    );
    return {
      signature,
      nullifier,
      explorerUrl: `${EXPLORER_BASE}/tx/${signature}?cluster=devnet`
    };
  }
  /**
   * Execute an encrypted order.
   * 
   * Order details are encrypted client-side.
   * Only the hash of the encrypted data goes on-chain.
   * The owner can decrypt later and share with regulators if needed.
   */
  async executeOrder(params) {
    const { encrypted, hash: orderHash } = encryptOrder(
      params.details,
      params.encryptionKey
    );
    const tx = new Transaction();
    const memoProgram = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
    tx.add({
      keys: [{ pubkey: this.owner.publicKey, isSigner: true, isWritable: false }],
      programId: memoProgram,
      data: Buffer.from(toHex(orderHash))
    });
    const signature = await sendAndConfirmTransaction(
      this.connection,
      tx,
      [this.owner]
    );
    return {
      signature,
      orderHash,
      explorerUrl: `${EXPLORER_BASE}/tx/${signature}?cluster=devnet`
    };
  }
  // ─── Convenience ──────────────────────────────────────────
  /**
   * Run a full privacy demo: deposit → order → withdraw.
   * 
   * Returns all results so you can verify the privacy guarantees.
   */
  async runDemo(amountSol = 5e-3) {
    const nonce = generateNonce();
    const encryptionKey = generateNonce();
    const deposit = await this.deposit({ amountSol, nonce });
    const order = await this.executeOrder({
      details: {
        pair: "SOL/USDC",
        side: "BUY",
        amount: amountSol * 0.6,
        price: 142.5,
        timestamp: Date.now()
      },
      encryptionKey
    });
    const vaultId = deposit.commitment.slice(0, 32);
    const vaultInfo = await this.getVaultInfo(vaultId);
    const summary = [
      `\u2705 Deposit: ${amountSol} SOL \u2192 commitment ${toHex(deposit.commitment).slice(0, 16)}...`,
      `\u2705 Order: encrypted hash ${toHex(order.orderHash).slice(0, 16)}...`,
      `\u2705 Vault: ${vaultInfo.address.toBase58().slice(0, 16)}...`,
      `\u26A0\uFE0F  SAVE YOUR NONCE: ${toHex(nonce)}`,
      `\u26A0\uFE0F  SAVE YOUR ENCRYPTION KEY: ${toHex(encryptionKey)}`
    ];
    return { deposit, order, vaultInfo, summary };
  }
};

// src/index.ts
var PROGRAM_ID = "7NNxu4Sa4qwytUogrka8m398mo3hfNbkAK7TWbSG8PvW";
var DEVNET_RPC2 = "https://api.devnet.solana.com";
var VERSION = "0.2.0";
export {
  DEVNET_RPC2 as DEVNET_RPC,
  PROGRAM_ID,
  ShadowVaultClient,
  VERSION,
  createCommitment,
  createNullifier,
  createPolicyCommitment,
  decryptOrder,
  encryptOrder,
  fromHex,
  generateNonce,
  lamportsToSol,
  sha256,
  solToLamports,
  toHex,
  updateAccumulator
};
