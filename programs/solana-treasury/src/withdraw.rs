use {
    anchor_lang::{prelude::*, system_program::{transfer, Transfer}},
    solana_program::{hash::{hash, Hash}, program::invoke_signed, system_instruction::create_account},
};

use crate::utils::*;

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct Coupon {
    address: String,    
    amount: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct WithdrawData {
    pub message: Vec<u8>,
    pub signature: [u8; 64],
    pub verify_data: Coupon
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
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    payer: Signer<'info>,

    #[account(mut)]
    /// CHECK: this is safe because hashed message and signature have been verified
    receiver: AccountInfo<'info>,

    #[account(
        mut,
        seeds = [
            b"treasury",
        ],
        bump,
    )]
    treasury: SystemAccount<'info>,

    #[account(
        mut,
        seeds = [
            generated_outside.key().as_ref(),
        ],
        bump,
    )]
    pda: SystemAccount<'info>,

    #[account(mut)]
    /// CHECK: this is safe 
    generated_outside: AccountInfo<'info>,

    system_program: Program<'info, System>,
}

pub fn withdraw(ctx: Context<Withdraw>, data: WithdrawData, eth_pubkey: [u8; 64]) -> Result<()> {
    create_pda_account(&ctx, &data)?;
    utils::verify(eth_pubkey, data.message, data.signature, data.verify_data.address, data.verify_data.amount)?;
    
    let transfer_amount = data.verify_data.amount;
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
        data.verify_data.amount,
    )?;

    Ok(())
}

pub fn create_pda_account(
    ctx: &Context<Withdraw>,
    data: &WithdrawData,
) -> Result<()> {
    let sig_hashed: Hash = hash(&data.signature);
    let key = Pubkey::new_from_array(sig_hashed.to_bytes());
    let gen_outside_key = ctx.accounts.generated_outside.key();
    msg!("sig_hashed {:?}", sig_hashed.to_bytes());
    msg!("key1: {}", key);
    msg!("outside gen {}", gen_outside_key);
    if key != gen_outside_key {
        return err!(WithdrawError::KeysDontMatch);
    }
    if !ctx.accounts.pda.data_is_empty() {
        return err!(WithdrawError::SignatureUsed);
    }
    let pda_account = &ctx.accounts.pda;
    let payer_account = &ctx.accounts.payer;
    let space = 1;
    let lamports = Rent::get()?.minimum_balance(space);
    let pda_pubkey = pda_account.key();
    let payer_pubkey = payer_account.key();
    let system_program_key = ctx.accounts.system_program.key();

    // Define the seeds and bump seed for the PDA
    let seeds: &[&[&[u8]]] = &[&[&key.to_bytes(), &[ctx.bumps.pda]]];

    // Create the `create_account` instruction
    let create_account_instruction = create_account(
        &payer_pubkey,
        &pda_pubkey,
        lamports,
        space as u64,
        &system_program_key,
    );

    // Invoke the instruction
    invoke_signed(
        &create_account_instruction,
        &[
            payer_account.to_account_info(),
            pda_account.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ],
        seeds,
    )?;

    msg!("Account Created");

    Ok(())
}