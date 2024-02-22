use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};
// use solana_program::sysvar::instructions::{ID as IX_ID, load_instruction_at_checked};
// use solana_program::instruction::Instruction;
// use solana_program::secp256k1_program::ID as SECP256K1_ID;
use solana_program::secp256k1_recover::{secp256k1_recover, Secp256k1Pubkey};
// Program path: /Users/teodorzafirov/solana-treasury/target/deploy/solana_treasury.so...
// Program Id: 3PxEqHbGAWZthkyuJvtTjjwYSQ3HRGJVyk8MbjnZP2mt
use solana_program::keccak::Hasher;
// use secp256k1::{Message, PublicKey, ecdsa};
use libsecp256k1::{PublicKey , PublicKeyFormat};


declare_id!("3PxEqHbGAWZthkyuJvtTjjwYSQ3HRGJVyk8MbjnZP2mt");


#[program]
pub mod solana_treasury {
    use super::*;

    // When lamports are transferred to a new address (without and existing account),
    // An account owned by the system program is created by default
    pub fn deposit(ctx: Context<DepositCtx>, amount: u64) -> Result<()> {
        transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.payer.to_account_info(),
                    to: ctx.accounts.treasury.to_account_info(),
                },
            ),
            amount,
        )?;

        emit!(DepositEvent {
            sender: *ctx.accounts.payer.to_account_info().key,
            amount: amount,
        });

        Ok(())
    }

    pub fn withdraw(ctx: Context<WithdrawCtx>, amount: u64) -> Result<()> {
        // PDA signer seeds
        let signer_seeds: &[&[&[u8]]] = &[&[b"treasury", &[ctx.bumps.treasury]]];
    
        // Create the new account, transferring lamports from the rent vault to the new account
        transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.treasury.to_account_info(),
                    to: ctx.accounts.receiver.to_account_info(),
                },
                signer_seeds
            ),
            amount,
        )?;

        Ok(())
    }

    pub fn recover(
        ctx: Context<New>
    ) -> Result<()> {
        // Define the Ethereum public key as a hexadecimal string

        let message = "69ee7a3423fa9be01fa80a47dffc9c3135fdccaab0ca5d5c4fbc3459b66c271e";
        let signature = "5bf05d6ede6316f675a3d0ad0896db0473aaa6084a1c373046fc5ea2a285edd81b0dfc8c5bb6bb0affff58fbc4c16f73b757414b0af05ab4bc139864903bb81b";
        let recovery_id = 0;

        

        // msg!(" hashSlav original --: {}", msg);
        // let message = format!(
        //         r#"{{"address":"{}","amount":{}}}"#,
        //         eth_address.clone(),
        //         amount
        //     );
        // let packed_data = anchor_lang::solana_program::keccak::hashv(&[&message.as_bytes()]);
        // let message_hex = hex::encode(packed_data);
        // msg!("Keccak message_hex encoded: {}", message_hex);

        let recovered_pubkey = secp256k1_recover(
            &message.as_bytes(),
            recovery_id,
            &signature.as_bytes(),
        )
        .map_err(|_| ProgramError::InvalidArgument)?;
        // let recovered_pubkey_hex = hex::encode(recovered_pubkey.0);
        // msg!("Generated Recovered PubKey: {}", recovered_pubkey_hex);
        // msg!("Generated pubkey slav: {}", eth_pubkey);
        // msg!("Generated my_sig: {}", my_sig);

        // If we're using this function for signature verification then we
        // need to check the pubkey is an expected value.
        // Here we are checking the secp256k1 pubkey against a known authorized pubkey.
        // if recovered_pubkey.0 != pubkey {
        //     msg!("Not the same");
        // }
    
        Ok(())
    }

    // External instruction that only gets executed if
    // a `Secp256k1Program.createInstructionWithEthAddress`
    // instruction was sent in the same transaction.
    // pub fn verify_secp(ctx: Context<Verify>, eth_address: [u8; 20], msg: Vec<u8>, sig: [u8; 64], recovery_id: u8) -> Result<()> {
    //     // Get what should be the Secp256k1Program instruction
    //     let ix: Instruction = load_instruction_at_checked(0, &ctx.accounts.ix_sysvar)?;

    //     // Check that ix is what we expect to have been sent
    //     utils::verify_secp256k1_ix(&ix, &eth_address, &msg, &sig, recovery_id)?;
    //     // Do other stuff
        
    //     Ok(())
    // }
}

/// This mod contains functions that validate that an instruction
/// is constructed the way we expect. In this case, this is for
/// `Secp256k1Program.createInstructionWithEthAddress()` instructions.
// pub mod utils {
//     use super::*;

//     /// Verify Secp256k1Program instruction fields
//     pub fn verify_secp256k1_ix(ix: &Instruction, eth_address: &[u8], msg: &[u8], sig: &[u8], recovery_id: u8) -> Result<()> {
//         if  ix.program_id       != SECP256K1_ID                 ||  // The program id we expect
//             ix.accounts.len()   != 0                            ||  // With no context accounts
//             ix.data.len()       != (12 + 20 + 64 + 1 + msg.len())   // And data of this size
//         {
//             return err!(SigError::SigVerificationFailed);    // Otherwise, we can already throw err
//         }

//         check_secp256k1_data(&ix.data, eth_address, msg, sig, recovery_id)?; // If that's not the case, check data

//         Ok(())
//     }

//     /// Verify serialized Secp256k1Program instruction data
//     pub fn check_secp256k1_data(data: &[u8], eth_address: &[u8], msg: &[u8], sig: &[u8], recovery_id: u8) -> Result<()> {
//         // According to this layout used by the Secp256k1Program
//         // https://github.com/solana-labs/solana-web3.js/blob/master/src/secp256k1-program.ts#L49

//         // "Deserializing" byte slices

//         let num_signatures                  = &[data[0]];           // Byte  0
//         let signature_offset                = &data[1..=2];         // Bytes 1,2
//         let signature_instruction_index     = &[data[3]];           // Byte  3
//         let eth_address_offset              = &data[4..=5];         // Bytes 4,5
//         let eth_address_instruction_index   = &[data[6]];           // Byte  6
//         let message_data_offset             = &data[7..=8];         // Bytes 7,8
//         let message_data_size               = &data[9..=10];        // Bytes 9,10
//         let message_instruction_index       = &[data[11]];          // Byte  11

//         let data_eth_address                = &data[12..12+20];     // Bytes 12..12+20
//         let data_sig                        = &data[32..32+64];     // Bytes 32..32+64
//         let data_recovery_id                = &[data[96]];          // Byte  96
//         let data_msg                        = &data[97..];          // Bytes 97..end

//         // Expected values

//         const SIGNATURE_OFFSETS_SERIALIZED_SIZE:    u16 = 11;
//         const DATA_START:                           u16 = 1 + SIGNATURE_OFFSETS_SERIALIZED_SIZE;

//         let msg_len:                    u16 = msg.len().try_into().unwrap();
//         let eth_address_len:            u16 = eth_address.len().try_into().unwrap();
//         let sig_len:                    u16 = sig.len().try_into().unwrap();

//         let exp_eth_address_offset:     u16 = DATA_START;
//         let exp_signature_offset:       u16 = DATA_START + eth_address_len;
//         let exp_message_data_offset:    u16 = exp_signature_offset + sig_len + 1;
//         let exp_num_signatures:          u8 = 1;

//         // Header and Arg Checks

//         // Header
//         if  num_signatures                  != &exp_num_signatures.to_le_bytes()         ||
//             signature_offset                != &exp_signature_offset.to_le_bytes()       ||
//             signature_instruction_index     != &[0]                                      ||
//             eth_address_offset              != &exp_eth_address_offset.to_le_bytes()     ||
//             eth_address_instruction_index   != &[0]                                      ||
//             message_data_offset             != &exp_message_data_offset.to_le_bytes()    ||
//             message_data_size               != &msg_len.to_le_bytes()                    ||
//             message_instruction_index       != &[0]
//         {
//             return err!(SigError::SigVerificationFailed);
//         }

//         // Arguments
//         if  data_eth_address    != eth_address      ||
//             data_sig            != sig              ||
//             data_recovery_id    != &[recovery_id]   ||
//             data_msg            != msg
//         {
//             return err!(SigError::SigVerificationFailed);
//         }

//         Ok(())
//     }
// }

#[event]
pub struct DepositEvent {
    pub sender: Pubkey,
    pub amount: u64
}

#[derive(Accounts)]
pub struct DepositCtx<'info> {
    #[account(mut)]
    payer: Signer<'info>,

    #[account(
        mut,
        seeds = [
            b"treasury",
        ],
        bump,
    )]
    treasury: SystemAccount<'info>,
    system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct WithdrawCtx<'info> {
    #[account(mut)]
    /// CHECK: this is unsafe
    receiver: AccountInfo<'info>,

    #[account(
        mut,
        seeds = [
            b"treasury",
        ],
        bump,
    )]
    treasury: SystemAccount<'info>,
    system_program: Program<'info, System>,
}

// #[derive(BorshSerialize, BorshDeserialize, Debug)]
// pub struct DemoSecp256k1RecoverInstruction {
//     /// The message bytes that were signed.
//     pub message: Vec<u8>,

//     /// The Ethereum-style signature, converted to Solana secp256k1 format (64 bytes).
//     pub signature: [u8; 64],

//     /// The recovery ID (0 or 1) used for signature recovery.
//     pub recovery_id: u8,
// }

#[derive(Accounts)]
pub struct New {}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct HashData {
    pub address: String,
    pub amount: u64,
}


// Context accounts
// #[derive(Accounts)]
// pub struct Verify<'info> {
//     pub sender: Signer<'info>,

//     /// CHECK: The address check is needed because otherwise
//     /// the supplied Sysvar could be anything else.
//     /// The Instruction Sysvar has not been implemented
//     /// in the Anchor framework yet, so this is the safe approach.
//     #[account(address = IX_ID)]
//     pub ix_sysvar: AccountInfo<'info>,
// }

/// Custom error codes
#[error_code]
pub enum SigError {
    #[msg("Signature verification failed.")]
    SigVerificationFailed
}






// let data = HashData {
//     address: eth_address.clone(),
//     amount: amount,
// };
// let data_bytes = data.try_to_vec().unwrap();
// let packed_data_1 = anchor_lang::solana_program::keccak::hashv(&[&data_bytes]);
// let hash_hex_1 = hex::encode(packed_data_1);
// msg!(" hash_hex_1 encoded--: {}", hash_hex_1);


// let message = format!(
//     r#"{{"address":"{}","amount":{}}}"#,
//     eth_address.clone(),
//     amount
// );
// let packed_data = anchor_lang::solana_program::keccak::hashv(&[&message.as_bytes()]);
// let hash_hex = hex::encode(packed_data);
// msg!(" msg_string string: {}", message);
// msg!(" hash_hex encoded ---: {}", hash_hex);


// let mut data0 = vec![];
// data0.extend_from_slice(&eth_address.as_bytes());
// data0.extend_from_slice(&amount.to_le_bytes());
// let msg_digest_0 = anchor_lang::solana_program::keccak::hashv(&[&data0]);
// let hash_hex_0 = hex::encode(msg_digest_0);
// msg!(" hash_hex_0 encoded -: {}", hash_hex_0);

// let dd = "{\"address\":\"0xb12B5e756A894775FC32EDdf3314Bb1B1944dC34\",\"amount\":10000000000000000000}";
// msg!(" msg_keccak string: {}", msg_keccak);
// let packed_data_some = anchor_lang::solana_program::keccak::hashv(&[&dd.as_bytes()]);
// let hash_hex_some = hex::encode(packed_data_some);
// msg!(" hash_som encoded ---: {}", hash_hex_some);