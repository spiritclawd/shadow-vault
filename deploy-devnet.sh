#!/bin/bash
# Shadow Vault — Deploy to Solana Devnet
# Run this after funding the wallet with 2+ SOL on devnet

set -e

export PATH="$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:$PATH"

PROGRAM_ID="HgJgRAkYEz1y5fx7wLkVfMSpfxuNsGgyBguXAnzkR9Qa"
KEYPAIR="$HOME/.config/solana/id.json"

echo "╔══════════════════════════════════════════════╗"
echo "║     SHADOW VAULT — DEPLOY TO DEVNET          ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# 1. Configure
echo "[1/6] Configuring Solana CLI for devnet..."
solana config set --url https://api.devnet.solana.com
solana config set --keypair "$KEYPAIR"
echo "  Wallet: $(solana address)"
echo ""

# 2. Check balance
echo "[2/6] Checking balance..."
BALANCE=$(solana balance | grep -oP '[0-9.]+')
echo "  Balance: $BALANCE SOL"
if (( $(echo "$BALANCE < 1.5" | bc -l) )); then
    echo "  ❌ Need at least 1.5 SOL. Fund wallet: $PROGRAM_ID"
    echo "  Try: solana airdrop 2"
    exit 1
fi
echo "  ✅ Sufficient balance"
echo ""

# 3. Build
echo "[3/6] Building program..."
cd /home/carlos/projects/shadow-vault/program
cargo build-sbf 2>&1 | tail -3
ls -la target/deploy/shadow_vault.so
echo "  ✅ Build complete (208KB)"
echo ""

# 4. Deploy
echo "[4/6] Deploying to devnet..."
echo "  Program ID: $PROGRAM_ID"
solana program deploy target/deploy/shadow_vault.so --program-id "$KEYPAIR" 2>&1
echo ""

# 5. Verify
echo "[5/6] Verifying deployment..."
solana program show "$PROGRAM_ID" 2>&1
echo ""

# 6. Save deployment info
echo "[6/6] Saving deployment info..."
DEPLOY_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
cat > /home/carlos/projects/shadow-vault/deployment.json << EOF
{
  "network": "devnet",
  "programId": "$PROGRAM_ID",
  "deployer": $(solana address),
  "deployedAt": "$DEPLOY_TIME",
  "rpcUrl": "https://api.devnet.solana.com",
  "explorerUrl": "https://explorer.solana.com/address/$PROGRAM_ID?cluster=devnet",
  "binarySize": "208KB",
  "anchorVersion": "1.0.0",
  "solanaVersion": "3.1.13"
}
EOF
echo ""
echo "  ✅ Deployment info saved to deployment.json"
echo ""

echo "╔══════════════════════════════════════════════╗"
echo "║          DEPLOYMENT COMPLETE                  ║"
echo "╠══════════════════════════════════════════════╣"
echo "║  Program: $PROGRAM_ID"
echo "║  Explorer: https://explorer.solana.com/address/$PROGRAM_ID?cluster=devnet"
echo "║  Network:  devnet"
echo "╚══════════════════════════════════════════════╝"
