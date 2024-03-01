## Solana Galactic Bridge - README.md

**Description:**

This program implements a secure deposit and withdrawal functionality for a Solana treasury account. Users can deposit SOL tokens and withdraw them with proper signature verification.

**Installation:**s

1. Set up an Anchor development environment: [https://docs.anchor.xyz/](https://docs.anchor.xyz/)
2. Clone this repository: `git clone https://github.com/weichain/galactic-bridge-sol`
3. Install dependencies: `yarn install`
4. Run tests: `anchor test`

**Usage:**
See examples in tests/solana-treasury.ts

**Depositing SOL:**

* Users can deposit SOL by calling the `deposit` function with the desired amount and their ICP address.

**Withdrawing SOL:**

* Users can withdraw SOL from the treasury by providing a signed message containing the withdrawal amount, receiver address, a valid signature, and a valid data hash.

**Details:**

* The program utilizes Anchor.lang for smart contract development on the Solana blockchain.
* Secure deposit and withdrawal processes are implemented using Anchor's `transfer` CPI and signature verification.
