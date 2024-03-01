use {
    anchor_lang::prelude::*,
    anchor_lang::system_program::{transfer, Transfer},
};

use crate::utils::*;

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct DataToVerify{
    address: String,
    amount: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct WithdrawData {
    message: Vec<u8>,
    signature: [u8; 64],
    verify_data: DataToVerify
} 

#[error_code]
pub enum WithdrawError {
    #[msg("Treasury is not signer")]
    TreasuryNotSigner,
    #[msg("Insufficient treasury amount")]
    TreasuryInsufficientAmount,
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

pub fn withdraw(ctx: Context<WithdrawCtx>, data: WithdrawData, eth_pubkey: [u8; 64]) -> Result<()> {
    // since data.verify_data.amount is ethreum format amount with 18 decimals but in solana decimals are 9
    const DENOMINATOR_TEST_PERPOSES: u64 = 1000000000;

    let transfer_amount = data.verify_data.amount / DENOMINATOR_TEST_PERPOSES;
    let treasury_balance = ctx.accounts.treasury.lamports();
    if treasury_balance < transfer_amount {
        return err!(WithdrawError::TreasuryInsufficientAmount);
    }

    utils::verify(eth_pubkey, data.message, data.signature, data.verify_data.address, data.verify_data.amount)?;

    // PDA signer seeds
    let signer_seeds: &[&[&[u8]]] = &[&[b"treasury", &[ctx.bumps.treasury]]];

    transfer(
        CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.treasury.to_account_info(),
                to: ctx.accounts.receiver.to_account_info(),
            },
            signer_seeds
        ),
        data.verify_data.amount / DENOMINATOR_TEST_PERPOSES,
    )?;

    Ok(())
}