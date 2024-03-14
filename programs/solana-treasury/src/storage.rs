use {
    anchor_lang::prelude::*,
    solana_program::{hash::{hash, Hash}, program::invoke_signed, system_instruction::create_account},
};

use crate::withdraw::*;

pub fn signature_pda_check(
    ctx: &Context<Withdraw>,
    data: &WithdrawData,
) -> Result<()> {
    if !ctx.accounts.signature_pda.data_is_empty() {
        return err!(WithdrawError::SignatureUsed);
    }
    let sig_hashed: Hash = hash(&data.signature);
    let key = Pubkey::new_from_array(sig_hashed.to_bytes());
    // msg!("sig_hashed {:?}", sig_hashed.to_bytes());
    // msg!("key1: {}", key);
    // msg!("outside gen {}", ctx.accounts.generated_outside.key());
    if key != ctx.accounts.hashed_signature_pubkey.key() {
        return err!(WithdrawError::KeysDontMatch);
    }
    let space = 1;
    let lamports = Rent::get()?.minimum_balance(space);
    let pda_account = &ctx.accounts.signature_pda;
    let payer_account = &ctx.accounts.payer;
    let pda_pubkey = pda_account.key();
    let payer_pubkey = payer_account.key();
    let system_program_key = ctx.accounts.system_program.key();

    // Define the seeds and bump seed for the PDA
    let seeds: &[&[&[u8]]] = &[&[&key.to_bytes(), &[ctx.bumps.signature_pda]]];

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