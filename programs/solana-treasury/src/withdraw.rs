use std::str::FromStr;

use anchor_lang::{prelude::*, system_program::{transfer, Transfer}};

use crate::storage;
use crate::utils;

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct Coupon {
    address: String,    
    amount: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct WithdrawData {
    pub message: Vec<u8>,
    pub signature: [u8; 64],
    pub coupon: Coupon,
    pub recovery_id: u8,
} 

#[error_code]
pub enum WithdrawError {
    #[msg("Treasury is not signer")]
    TreasuryNotSigner,
    #[msg("Insufficient treasury amount")]
    TreasuryInsufficientAmount,
    #[msg("Keys dont match")]
    KeysDontMatch,
    #[msg("Signature is used")]
    SignatureUsed,
    #[msg("Context receiver does not match coupon address")]
    ReceiverMismatch,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(mut)]
    /// CHECK: this is safe because hashed message and signature have been verified
    pub receiver: AccountInfo<'info>,

    #[account(
        mut,
        seeds = [
            b"treasury",
        ],
        bump,
    )]
    treasury: SystemAccount<'info>,
    
    #[account(mut)]
    /// CHECK: this is safe because hash of signature is unique and verified
    pub hashed_signature_pubkey: AccountInfo<'info>,

    #[account(
        mut,
        seeds = [
            hashed_signature_pubkey.key().as_ref(),
        ],
        bump,
    )]
    pub signature_pda: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn withdraw(ctx: Context<Withdraw>, data: WithdrawData, eth_pubkey: [u8; 64]) -> Result<()> {
    let addr = Pubkey::from_str(&data.coupon.address).expect("Invalid Coupon Address"); 
    if ctx.accounts.receiver.key() != addr {
        return err!(WithdrawError::ReceiverMismatch);
    }

    utils::verify(&eth_pubkey, &data.message, &data.signature, &data.coupon.address, &data.coupon.amount, data.recovery_id)?;
    storage::signature_pda_check(&ctx, &data)?;
    
    let transfer_amount = data.coupon.amount;
    let treasury_balance = ctx.accounts.treasury.lamports();
    if treasury_balance < transfer_amount {
        return err!(WithdrawError::TreasuryInsufficientAmount);
    }

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
        data.coupon.amount,
    )?;

    Ok(())
}

