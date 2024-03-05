## Solana Galactic Bridge

**Description:**

This program implements a secure deposit and withdrawal functionality for a Solana treasury account. Users can deposit SOL tokens and withdraw them with proper signature verification.

**Installation:**

1. Set up an Anchor development environment: [https://docs.anchor.xyz/](https://docs.anchor.xyz/)
2. Clone this repository: `git clone https://github.com/weichain/galactic-bridge-sol`
3. Install dependencies: `yarn install`
4. Run tests: `anchor test`

**Usage:**
See examples in tests/solana-treasury.ts

**Depositing SOL:**

* Users can deposit SOL by calling the `deposit` function with the desired amount and their ICP address.

    **Inputs:**

    * **Context<DepositCtx> ctx:** Provides access to relevant accounts and program information.

        * **payer:** This `Signer` account represents the party initiating the deposit and providing the funds.
        * **treasury:** This `SystemAccount` represents the account that will receive the deposited lamports. 
        * **system_program:** This `Program` account represents the Solana system program, which provides functionalities like transferring lamports between accounts. 

    * **DepositData data:** Contains the deposit details:
        * **amount:** The amount of lamports to deposit (u64).
        * **address_icp:** The ICP address to receive ckSOL(String).
        
    **Event Emission:**
    * Emit a `DepositEvent` after a successful deposit.
    * This event provides information about the transaction to interested parties, enabling integration with other applications or monitoring systems.

        **Fields within DepositEvent:**
        
        * **address_icp:** This field stores the receiver's ICP address obtained from the `data.address_icp` input.
        * **amount:** This field holds the deposited amount (`transfer_amount`) transferred from the payer to the treasury.

    **Outputs:**
    
    * **Result<()>:** Indicates success (Ok()) or an error (Err(DepositError)).
    * **DepositEvent:** An emitted event containing:
        * **address_icp:** The ICP address to receive ckSol.
        * **amount:** The deposited amount.

    **Algorithm Flow:**
    
    1. **Validation:**
        * Checks if the payer is a signer. If not, returns `DepositError::PayerNotSigner`.
        * Verifies if the payer has enough lamports to cover the transfer. If not, returns `DepositError::PayerInsufficientAmount`.
    
    2. **Transfer:**
        * Uses the `transfer` instruction from the system program to transfer lamports from the payer's account to the treasury account.
    
    3. **Event Emission:**
        * Emits a `DepositEvent` with the receiver's ICP address and the deposited amount.
    
    4. **Success:**
        * Returns `Ok(())` to signal successful deposit.




**Withdrawing SOL:**

* Users can withdraw SOL from the treasury by calling `withdraw` function providing a signed message containing the withdrawal amount, receiver Solana address, a valid signature, and a valid data hash.

    **Inputs:**
    
    * **Context<WithdrawCtx> ctx:** Provides access to relevant accounts and program information.
    * **WithdrawData data:** Contains data for withdrawal:
        * **message:** A hashed message for verification (Vec<u8>).
        * **signature:** A signature over the message ([u8; 64]).
        * **verify_data:** Information for verification:
            * **address:** The recipient's address (String).
            * **amount:** The withdrawal amount in Ethereum format (u64).

    **Outputs:**
    
    * **Result<()>:** Indicates success (Ok()) or errors:
        * WithdrawError: Treasury-related issues.
        * ValidationError: Data or signature validation failures.

    **Algorithm Flow:**
    
    1. **Validation:**
        * Checks if the treasury has enough lamports for the withdrawal.
        * Calls `utils::verify` to verify:
            * Message hash matches the generated hash from verify_data.
            * Signature validity using provided Ethereum public key.
    
    2. **Signer Seeds:**
        * Prepares seeds for treasury PDA (Program Derived Account).
    
    3. **Transfer:**
        * Uses `transfer` with signer seeds to transfer lamports from treasury to receiver.
    4. **Success:**
        * Returns `Ok(())` if successful.

**Signature verification**
* This function `utils::verify` which is used in `withdraw` before transfering lamports, verifies the integrity and authenticity of a withdrawal request in a Solana program.

    **Inputs:**
    
    * `eth_pubkey`: Ethereum public key which is hardcoded in the Treasury program, associated with the withdrawal request ([u8; 64]).
    * `msg`: The message bytes representing the withdrawal information (Vec<u8>).
    * `sig`: The signature over the message ([u8; 64]).
    * `msg_address`: The recipient's address for the withdrawal (String).
    * `msg_amount`: The withdrawal amount in Ethereum format (u64).

    **Outputs:**
    
    * `Result<()>`: Indicates success (Ok()) or error (Err(ValidationError)):
        * `InvalidDataHash`: The message hash doesn't match the data derived from `msg_address` and `msg_amount`.
        * `InvalidSignature`: The signature doesn't match the provided Ethereum public key.

    **Algorithm Flow:**
    
    1. **Message Construction:**
        * Creates a formatted string message containing `msg_address` and `msg_amount`.
    2. **Hashing:**
        * Calculates the hash of the constructed message.
    3. **Data Hash Validation:**
        * Compares the provided message bytes (`msg`) with the hash of the constructed message. If they don't match, it throws an `InvalidDataHash` error, indicating a mismatch between the signed data and the claimed withdrawal details.
    4. **Signature Verification:**
        * Attempts to recover the public key from the signature (`sig`) using `solana_program::secp256k1_recover::secp256k1_recover` function.
        * If the recovered public key matches the pubkey embeded in the program, it signifies a valid signature.
    5. **Validation Result:**
        * If no match is found for the recovered public key and the pubkey embeded in the program, it throws an `InvalidSignature` error, indicating the signature doesn't correspond to the provided public key.
        * If data and signature verification are successful, the function returns `Ok(())`.

    **Key Points:**
    
    * Used for cross-chain communication, specifically verifying Ethereum-related withdrawals on Solana.
    * Ensures the integrity of the withdrawal request (message not tampered with) and authenticity (signature originates from the intended party).
    * Employs `secp256k1_recover` for signature recovery with support for both recovery IDs.
    * Throws specific errors for data and signature verification failures.
    