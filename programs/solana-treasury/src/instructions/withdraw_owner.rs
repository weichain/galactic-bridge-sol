use anchor_lang::{
    prelude::*,
    system_program::{transfer, Transfer},
};
use std::mem::size_of;

#[derive(Accounts)]
pub struct WithdrawOwner<'info> {
    #[account(mut, address = "8nZLXraZUARNmU3P8PKbJMS7NYs7aEyw6d1aQx1km3t2".parse::<Pubkey>().unwrap())]
    pub owner: Signer<'info>,

    #[account(mut)]
    /// CHECK: this is safe because it's an admin call
    pub receiver: AccountInfo<'info>,

    #[account(
        seeds = [
            b"withdraw_owner_interval",
        ],
        bump,
    )]
    pub withdraw_owner_interval: Account<'info, WithdrawOwnerInterval>,

    #[account(
        mut,
        seeds = [
            b"treasury",
        ],
        bump,
    )]
    treasury: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[error_code]
pub enum WithdrawOwnerError {
    #[msg("Invalid slot interval")]
    InvalidSlotInterval,
}

#[event]
pub struct WithdrawOwnerEvent {
    pub to: Pubkey,
    pub amount: u64,
}

pub fn withdraw_owner(ctx: Context<WithdrawOwner>, transfer_amount: u64) -> Result<()> {
    let current_slot = Clock::get()?.slot;
    let slot_start = ctx.accounts.withdraw_owner_interval.slot_start;
    let interval_duration = ctx.accounts.withdraw_owner_interval.interval_duration;

    let combined_duration = slot_start
        .checked_add(interval_duration)
        .expect("Invalid slot_start and interval_duration addition");

    if current_slot < slot_start || current_slot > combined_duration {
        return err!(WithdrawOwnerError::InvalidSlotInterval);
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
            signer_seeds,
        ),
        transfer_amount,
    )?;

    emit!(WithdrawOwnerEvent {
        to: ctx.accounts.receiver.key(),
        amount: transfer_amount,
    });

    Ok(())
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct WithdrawOwnerIntervalData {
    pub slot_start: u64,
    pub interval_duration: u64,
}

#[account]
pub struct WithdrawOwnerInterval {
    pub slot_start: u64,
    pub interval_duration: u64,
}

#[derive(Accounts)]
pub struct SetWithdrawOwnerIntervalContext<'info> {
    #[account(mut, address = "8nZLXraZUARNmU3P8PKbJMS7NYs7aEyw6d1aQx1km3t2".parse::<Pubkey>().unwrap())]
    pub owner: Signer<'info>,

    #[account(
        init_if_needed,
        payer = owner,
        space = 8 + size_of::<WithdrawOwnerInterval>(),
        seeds = [
            b"withdraw_owner_interval",
        ],
        bump,
    )]
    pub withdraw_owner_interval: Account<'info, WithdrawOwnerInterval>,
    pub system_program: Program<'info, System>,
}

#[error_code]
pub enum SetWithdrawDurationError {
    #[msg("Invalid start slot")]
    InvalidStartSlot,
    #[msg("Invalid duration")]
    InvalidDuration,
}

pub fn set_withdraw_owner_interval(
    ctx: Context<SetWithdrawOwnerIntervalContext>,
    data: WithdrawOwnerIntervalData,
) -> Result<()> {
    let withdraw_owner_interval = &mut ctx.accounts.withdraw_owner_interval;
    let slot_start = data.slot_start;
    let interval_duration = data.interval_duration;

    if interval_duration == 0 {
        return err!(SetWithdrawDurationError::InvalidDuration);
    }

    let current_slot = Clock::get()?.slot;
    if slot_start <= current_slot {
        return err!(SetWithdrawDurationError::InvalidStartSlot);
    }

    withdraw_owner_interval.slot_start = slot_start;
    withdraw_owner_interval.interval_duration = interval_duration;

    Ok(())
}
