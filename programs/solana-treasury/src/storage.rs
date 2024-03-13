// use {
//   anchor_lang::prelude::*,
// };

// pub fn create_signature_pda(ctx: Context<CreateSignaturePda>, signature1: String) -> Result<()> {
//   // let dd = ctx.accounts.signature_pda.to_account_info();
//   // let aa = Account::<SignaturePda>::try_from(&dd);

//     // Attempt to load the account to check if it already exists
//     // if let Ok(existing_account) = Account::<SignaturePda>::try_from(&ctx.accounts.signature_pda.to_account_info()) {
//     //     if existing_account.signature == signature1 {
//     //         // The account already exists with the same signature
//     //         return Err(ErrorCode::SignaturePdaAlreadyExists.into());
//     //     }
//     // }

//     // If the account does not exist or has a different signature, proceed to create it
//     let signature_pda = &mut ctx.accounts.signature_pda;
//     signature_pda.signature = signature1;
//     Ok(())
// }

// #[account]
// pub struct SignaturePda {
//     pub signature: String,
// }

// #[derive(Accounts)]
// pub struct CreateSignaturePda<'info> {
//     #[account(init, payer = user, space = 8 + 64 + 32, seeds = [b"signature"], bump)]
//     pub signature_pda: Account<'info, SignaturePda>,
//     pub dynamic_seed: &[u8],
//     #[account(mut)]
//     pub user: Signer<'info>,
//     pub system_program: Program<'info, System>,
// }

// #[error_code]
// pub enum ErrorCode {
//     #[msg("The signature PDA already exists.")]
//     SignaturePdaAlreadyExists,
// }
