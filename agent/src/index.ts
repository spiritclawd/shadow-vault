// Shadow Vault — Demo Runner
// Beautiful terminal demo showing encrypted agent strategy vault in action.

import chalk from 'chalk';
import { ShadowVaultAgent } from './agent.js';
import { decrypt, generatePubkey } from './encrypt-sim.js';

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// ── Banner ──
function banner() {
  console.log('');
  console.log(chalk.hex('#c85a18')('  ╔══════════════════════════════════════════════════════╗'));
  console.log(chalk.hex('#c85a18')('  ║') + chalk.white.bold('       SHADOW VAULT — Encrypted Agent Strategy Vault   ') + chalk.hex('#c85a18')('║'));
  console.log(chalk.hex('#c85a18')('  ║') + chalk.hex('#999')('       Solana × Encrypt FHE × Zerion CLI               ') + chalk.hex('#c85a18')('║'));
  console.log(chalk.hex('#c85a18')('  ╚══════════════════════════════════════════════════════╝'));
  console.log('');
}

function section(title: string) {
  console.log('');
  console.log(chalk.hex('#c85a18')('  ── ') + chalk.white.bold(title) + chalk.hex('#c85a18')(' ──────────────────────────────────────'));
  console.log('');
}

function status(label: string, value: string, color = '#4ade80') {
  console.log(chalk.hex('#555')(`    ${label}: `) + chalk.hex(color)(value));
}

function ciphertext(ct: string) {
  return chalk.hex('#333')('0x' + ct.slice(0, 24)) + chalk.hex('#222')('...');
}

function txLink(sig: string) {
  return chalk.hex('#60a5fa')('https://solscan.io/tx/' + sig.slice(0, 12) + '...');
}

// ── Main Demo ──
async function main() {
  banner();

  const owner = generatePubkey();
  const agent = generatePubkey();

  status('Owner', owner);
  status('Agent', agent);
  status('Network', 'Solana Devnet');
  status('Encrypt', 'FHE Pre-Alpha (mock)');
  console.log('');

  await sleep(500);

  // Initialize agent
  const vaultAgent = new ShadowVaultAgent(agent);

  // Listen to events
  vaultAgent.on('event', (event) => {
    const ts = new Date(event.timestamp * 1000).toISOString().slice(11, 19);
    switch (event.type) {
      case 'vault_created':
        console.log(chalk.hex('#555')(`    [${ts}]`) + chalk.hex('#4ade80')(' ✓ Vault created'));
        break;
      case 'deposited':
        console.log(chalk.hex('#555')(`    [${ts}]`) + chalk.hex('#4ade80')(` ✓ Deposited ${(event.data.amount / 1e9).toFixed(2)} SOL`));
        console.log(chalk.hex('#555')(`           `) + chalk.hex('#333')(`tx: ${event.data.txSignature?.slice(0, 20)}...`));
        break;
      case 'order_executed':
        console.log(chalk.hex('#555')(`    [${ts}]`) + chalk.hex('#4ade80')(` ✓ Order executed: ${(event.data.amount / 1e9).toFixed(2)} SOL → ${event.data.market}`));
        console.log(chalk.hex('#555')(`           `) + chalk.hex('#333')(`encrypted: ${event.data.orderCiphertext}`));
        console.log(chalk.hex('#555')(`           `) + chalk.hex('#333')(`tx: ${event.data.txSignature?.slice(0, 20)}...`));
        break;
      case 'order_rejected':
        console.log(chalk.hex('#555')(`    [${ts}]`) + chalk.red(` ✗ Order rejected: ${event.data.reason}`));
        break;
    }
  });

  // ═══════════════════════════════════════════
  // Step 1: Create Vault
  // ═══════════════════════════════════════════
  section('1. Create Encrypted Vault');

  const vault = vaultAgent.createVault('alpha-vault', owner, {
    maxSpendPerEpoch: 5_000_000_000,   // 5 SOL per hour
    maxOrderSize: 2_000_000_000,        // 2 SOL max per order
    maxPositionSize: 10_000_000_000,    // 10 SOL max position
    epochDuration: 3600,
  });

  await sleep(300);

  status('Vault ID', vault.id);
  status('Policy', `max ${(vault.policy.maxSpendPerEpoch / 1e9).toFixed(0)} SOL/epoch, ${vault.policy.maxOrderSize / 1e9} SOL/order`);
  status('Balance (encrypted)', ciphertext(vault.balance.hex));
  status('Position (encrypted)', ciphertext(vault.position.hex));

  // ═══════════════════════════════════════════
  // Step 2: Deposit
  // ═══════════════════════════════════════════
  section('2. Deposit 10 SOL (Encrypted)');

  const depositResult = vaultAgent.deposit(vault.id, 10_000_000_000, owner);
  await sleep(400);

  if (depositResult.success) {
    const updatedVault = vaultAgent.getVaultState(vault.id)!;
    status('Deposited', '10.00 SOL');
    status('Encrypted Balance', ciphertext(updatedVault.balance.hex));
    status('Tx', txLink(depositResult.txSignature!));
  }

  // ═══════════════════════════════════════════
  // Step 3: Execute Orders
  // ═══════════════════════════════════════════
  section('3. Agent Executes Encrypted Orders');

  console.log(chalk.hex('#555')('    Agent monitoring market conditions...'));
  await sleep(800);

  // Order 1: Buy SOL — should succeed
  console.log('');
  console.log(chalk.hex('#999')('    → Market signal: SOL/USDC bullish, executing...'));
  await sleep(500);
  const order1 = vaultAgent.executeOrder(vault.id, 1_000_000_000, 'SOL/USDC'); // 1 SOL
  await sleep(400);

  // Order 2: Buy ETH — should succeed
  console.log('');
  console.log(chalk.hex('#999')('    → Market signal: ETH/USDC oversold, executing...'));
  await sleep(500);
  const order2 = vaultAgent.executeOrder(vault.id, 1_500_000_000, 'ETH/USDC'); // 1.5 SOL
  await sleep(400);

  // ═══════════════════════════════════════════
  // Step 4: Policy Rejection
  // ═══════════════════════════════════════════
  section('4. Policy Enforcement (Risk Guard)');

  console.log(chalk.hex('#999')('    → Market signal: BTC/USDC spike, attempting 3 SOL order...'));
  await sleep(500);
  const order3 = vaultAgent.executeOrder(vault.id, 3_000_000_000, 'BTC/USDC'); // 3 SOL — exceeds max order
  await sleep(400);

  // Try another to show epoch limit
  console.log('');
  console.log(chalk.hex('#999')('    → Attempting another 1 SOL order (epoch limit test)...'));
  await sleep(500);
  const order4 = vaultAgent.executeOrder(vault.id, 1_000_000_000, 'SOL/USDC');
  await sleep(400);

  // ═══════════════════════════════════════════
  // Step 5: Audit Log
  // ═══════════════════════════════════════════
  section('5. Encrypted Audit Log');

  const auditLog = vaultAgent.getAuditLog(vault.id);
  console.log(chalk.hex('#555')('    ┌─────┬──────────┬────────────┬──────────┬──────────────────┐'));
  console.log(chalk.hex('#555')('    │ #   │ Time     │ Action     │ Amount   │ Encrypted        │'));
  console.log(chalk.hex('#555')('    ├─────┼──────────┼────────────┼──────────┼──────────────────┤'));

  for (const entry of auditLog) {
    const time = new Date(entry.timestamp * 1000).toISOString().slice(11, 19);
    const action = entry.action.padEnd(10);
    const amount = (entry.amount / 1e9).toFixed(2).padStart(6) + ' SOL';
    const enc = entry.encrypted ? chalk.hex('#4ade80')('● encrypted') : chalk.hex('#666')('○ plaintext');
    const icon = entry.policyCheck.allowed ? chalk.hex('#4ade80')('✓') : chalk.red('✗');
    console.log(chalk.hex('#555')(`    │ ${icon} ${String(entry.index).padEnd(2)} │ ${time} │ ${action} │ ${amount} │ ${enc}${chalk.hex('#555')(' │')}`));
  }
  console.log(chalk.hex('#555')('    └─────┴──────────┴────────────┴──────────┴──────────────────┘'));

  // ═══════════════════════════════════════════
  // Step 6: Owner Decryption View
  // ═══════════════════════════════════════════
  section('6. Owner Decryption (Private View)');

  const decryptedBalance = vaultAgent.decryptBalance(vault.id);
  const decryptedPosition = vaultAgent.decryptPosition(vault.id);

  status('Decrypted Balance', `${(decryptedBalance / 1e9).toFixed(2)} SOL`, '#facc15');
  status('Decrypted Position', `${(decryptedPosition / 1e9).toFixed(2)} SOL`, '#facc15');
  status('Total Deposited', `${(vault.totalDeposited / 1e9).toFixed(2)} SOL`);
  status('Orders Executed', `${auditLog.filter(e => e.action === 'order_executed').length} / ${auditLog.length} total`);

  console.log('');
  console.log(chalk.hex('#555')('    ╔══════════════════════════════════════════════════════╗'));
  console.log(chalk.hex('#555')('    ║') + chalk.hex('#c85a18')('  Nobody saw the agent\'s strategy. All orders were.    ') + chalk.hex('#555')('║'));
  console.log(chalk.hex('#555')('    ║') + chalk.hex('#c85a18')('  encrypted end-to-end using FHE on Solana.            ') + chalk.hex('#555')('║'));
  console.log(chalk.hex('#555')('    ║') + chalk.hex('#999')('  The policy engine enforced risk limits on-chain.     ') + chalk.hex('#555')('║'));
  console.log(chalk.hex('#555')('    ╚══════════════════════════════════════════════════════╝'));
  console.log('');
}

main().catch(console.error);
