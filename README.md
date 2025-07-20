# Solana Liquidity Monitor & Auto-Swap Bot

![Solana Logo](https://solana.com/src/img/branding/solanaLogoMark.svg)

## ✨ Features

| Feature                   | Description                                       |
| ------------------------- | ------------------------------------------------- |
| 🔍 Liquidity Monitoring   | Real-time tracking of Raydium pool creations      |
| 🔒 Token Safety Checks    | RugCheck API integration + on-chain verification  |
| 💸 Auto-Swapping          | SOL ↔ Token swaps with configurable amounts       |
| 📊 Transaction Management | Supports both V0 and legacy transactions          |
| 📝 Detailed Logging       | Timestamped console output with transaction links |

## 🛠 Installation

```bash
# Clone repository
git clone https://github.com/sokoljudo/solana-sniper.git
cd solana-sniper

# Install dependencies
npm install

# Or with yarn
yarn install
```

# Start the bot

node index.js

# Expected output:

[7/20/2025 14:30:45.123] 🔗 Connecting to Solana network...
[7/20/2025 14:30:46.456] 🚀 Starting liquidity monitoring...

## 🔒 Security

Safety Checks Performed:
Token Verification

❌ Freeze authority check

❌ Mint authority check

✅ RugCheck risk analysis

## ⚠ Disclaimer

```bash
- WARNING: Use at your own risk!
- This is experimental software. Always:
+ 1. Test with small amounts
+ 2. Monitor transactions
+ 3. Secure your private keys
```
