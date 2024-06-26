use {
    anchor_lang::prelude::*,
    solana_program::{
        hash::{hash, Hash},
        program::invoke_signed,
        system_instruction::create_account,
    },
};

use crate::instructions::{Withdraw, WithdrawData, WithdrawError};

pub fn signature_pda_check(ctx: &Context<Withdraw>, data: &WithdrawData) -> Result<()> {
    if !ctx.accounts.signature_pda.data_is_empty() {
        return err!(WithdrawError::SignatureUsed);
    }

    let sig_hashed: Hash = hash(&data.signature);
    let key = Pubkey::new_from_array(sig_hashed.to_bytes());

    if key != ctx.accounts.hashed_signature_pubkey.key() {
        return err!(WithdrawError::KeysDontMatch);
    }

    let space = 1;
    let lamports = Rent::get()?.minimum_balance(space);

    // Define the seeds and bump seed for the PDA
    let seeds: &[&[&[u8]]] = &[&[&key.to_bytes(), &[ctx.bumps.signature_pda]]];

    // Create the `create_account` instruction
    let create_account_instruction = create_account(
        &ctx.accounts.payer.key(),
        &ctx.accounts.signature_pda.key(),
        lamports,
        space as u64,
        &ctx.accounts.system_program.key(),
    );

    // Invoke the instruction
    invoke_signed(
        &create_account_instruction,
        &[
            ctx.accounts.signature_pda.to_account_info(),
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ],
        seeds,
    )?;

    Ok(())
}
