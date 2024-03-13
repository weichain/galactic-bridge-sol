use anchor_lang::prelude::*;
use solana_program::stake_history::Epoch;
use solana_program::system_instruction::create_account;
use solana_program::program::invoke_signed;

pub mod utils;

pub mod deposit;
use deposit::*;

pub mod withdraw;
use withdraw::*;

// pub mod storage;
// use storage::*;

declare_id!("HS6NTv6GBVSLct8dsimRWRvjczJTAgfgDJt8VpR8wtGm");

#[program]
pub mod solana_treasury {
    use super::*;

    // ccf59acab5758755cd1e06c5143d3727904b268579b24f948fabd6753d3ee143cdf4b76334aeb51b758cba5755253f48a341294f11c14fe018046243774f3f30
    const ETH_PUBKEY: [u8; 64] = [
        204, 245, 154, 202, 181, 117, 135,  85, 205,  30,   6,
        197,  20,  61,  55,  39, 144,  75,  38, 133, 121, 178,
         79, 148, 143, 171, 214, 117,  61,  62, 225,  67, 205,
        244, 183,  99,  52, 174, 181,  27, 117, 140, 186,  87,
         85,  37,  63,  72, 163,  65,  41,  79,  17, 193,  79,
        224,  24,   4,  98,  67, 119,  79,  63,  48
      ];

    pub fn deposit(ctx: Context<Deposit>, data: DepositData) -> Result<()> {
        deposit::deposit(ctx, data)?;

        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>, data: WithdrawData) -> Result<()>
    { 
        withdraw::withdraw(ctx, data, ETH_PUBKEY)?;
    //     let mut sig = data.signature.to_vec();
    // let msg = data.message;
    // // Find the PDA and bump seed
    // let (pda, bump_seed) = Pubkey::find_program_address(&[b"nqkavshitstuf"], ctx.program_id);
    // let mut lamports1: u64 = 0;
    // let mut data1: Vec<u8> = vec![];
    // // // Attempt to load the account to check if it already exists
    // let account = AccountInfo::new(
    //     &pda, // account pubkey
    //     false, // is_signer
    //     false, // is_writable
    //     &mut lamports1, // lamports
    //     &mut data1, // data
    //     ctx.program_id, // owner
    //     false, // executable
    //     Epoch::default(), // rent_epoch
    // );
    // // let dd = account.clone();
    // let is_account_data_empty = account.try_data_is_empty()?;
    // let infos = &[
    //     account,
    //     ctx.accounts.payer.to_account_info(),
    //     // dd
    // ];
    // if is_account_data_empty {
    //     msg!("Account does not exist");
    //     let space = 0; // Define the space for the account
    //     let signer_seeds: &[&[&[u8]]] = &[&[b"nqkavshitstuf", &[bump_seed]]];
    //     // The minimum lamports for rent exemption
    //     let lamports = (Rent::get()?).minimum_balance(0);
    //     // create_account(ctx.accounts.payer.key, &pda, lamports, space, ctx.program_id);
    //     invoke_signed(
    //         &create_account(ctx.accounts.payer.key, &pda, lamports, space, ctx.program_id),
    //         infos,
    //         signer_seeds,
    //     )?;
    // } else {
    //     msg!("Account exists")
    // }

        Ok(())
    }

    
    
    
}

// #[derive(AnchorSerialize, AnchorDeserialize)]
// pub struct DataToVerify{
//     address: String,    
//     amount: u64,
// }

// #[derive(AnchorSerialize, AnchorDeserialize)]
// pub struct WithdrawData {
//     pub message: Vec<u8>,
//     pub signature: [u8; 64],
//     pub verify_data: DataToVerify
// } 

// #[error_code]
// pub enum WithdrawError {
//     #[msg("Treasury is not signer")]
//     TreasuryNotSigner,
//     #[msg("Insufficient treasury amount")]
//     TreasuryInsufficientAmount,
// }

// #[derive(Accounts)]
// pub struct WithdrawCtx<'info> {
//     #[account(mut)]
//     payer: Signer<'info>,

//     #[account(mut)]
//     /// CHECK: this is safe because hashed message and signature have been verified
//     receiver: AccountInfo<'info>,

//     #[account(
//         mut,
//         seeds = [
//             b"treasury",
//         ],
//         bump,
//     )]
//     treasury: SystemAccount<'info>,
//     system_program: Program<'info, System>,
// }
