// Shadow Vault — Types

export interface Ciphertext {
  hex: string;
  type: 'EUint64' | 'EUint128';
  isEncrypted: boolean;
}

export interface Policy {
  maxSpendPerEpoch: number;
  maxOrderSize: number;
  maxPositionSize: number;
  epochDuration: number; // seconds
  expiry: number; // unix timestamp, 0 = never
}

export interface PolicyCheck {
  allowed: boolean;
  reason?: string;
  epochSpent?: number;
  epochLimit?: number;
}

export interface VaultState {
  id: string;
  owner: string;
  agent: string;
  balance: Ciphertext;
  position: Ciphertext;
  totalDeposited: number;
  totalWithdrawn: number;
  orderCount: number;
  isActive: boolean;
  createdAt: number;
  policy: Policy;
  epochSpent: number;
  epochStart: number;
}

export interface OrderEvent {
  type: 'vault_created' | 'deposited' | 'order_executed' | 'order_rejected' | 'withdrawn' | 'policy_updated';
  timestamp: number;
  vault: string;
  data: Record<string, any>;
}

export interface AuditEntry {
  index: number;
  timestamp: number;
  action: string;
  amount: number;
  market?: string;
  encrypted: boolean;
  policyCheck: PolicyCheck;
  txSignature?: string;
}
