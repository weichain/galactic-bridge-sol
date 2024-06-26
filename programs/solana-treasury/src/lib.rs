use anchor_lang::prelude::*;

pub mod state;
use state::*;

pub mod utils;

pub mod instructions;
use instructions::*;

declare_id!("AAJL4DeXnWBNRowWjvpkAgwtAACpz6NfaA1T2p8Hrpy");

#[program]
pub mod solana_treasury {
    use super::*;

    // 04c1ab9735077d400d7e992087ed3e09721ecd25d2238f5b6d0ec5f899aff090db0f3c5b976ca2305440f31367e3b5c51cb58413de5962714ea41015812ed5069f
    const ETH_PUBKEY: [u8; 64] = [
        193, 171, 151, 53, 7, 125, 64, 13, 126, 153, 32, 135, 237, 62, 9, 114, 30, 205, 37, 210,
        35, 143, 91, 109, 14, 197, 248, 153, 175, 240, 144, 219, 15, 60, 91, 151, 108, 162, 48, 84,
        64, 243, 19, 103, 227, 181, 197, 28, 181, 132, 19, 222, 89, 98, 113, 78, 164, 16, 21, 129,
        46, 213, 6, 159,
    ];

    pub fn deposit(ctx: Context<Deposit>, data: DepositData) -> Result<()> {
        deposit::deposit(ctx, data)?;

        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>, data: WithdrawData) -> Result<()> {
        withdraw::withdraw(ctx, data, ETH_PUBKEY)?;

        Ok(())
    }

    pub fn withdraw_owner(ctx: Context<WithdrawOwner>, transfer_amount: u64) -> Result<()> {
        withdraw_owner::withdraw_owner(ctx, transfer_amount)?;

        Ok(())
    }

    pub fn set_withdraw_owner_interval(
        ctx: Context<SetWithdrawOwnerIntervalContext>,
        data: WithdrawOwnerIntervalData,
    ) -> Result<()> {
        withdraw_owner::set_withdraw_owner_interval(ctx, data)?;

        Ok(())
    }
}
