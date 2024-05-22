use anchor_lang::prelude::*;

pub mod storage;
pub mod utils;

pub mod deposit;
use deposit::*;

pub mod withdraw;
use withdraw::*;

declare_id!("AAJL4DeXnWBNRowWjvpkAgwtAACpz6NfaA1T2p8Hrpy");

#[program]
pub mod solana_treasury {
    use super::*;

    // 0450871d924d2c8f80a3fc518fa63fe2248d03e40d944ffe3fcd6ccf778f90ef71844d1adf401be7a6ac8ab05f22fa20c6a6d114484f46d98345e435f740a16271
    const ETH_PUBKEY: [u8; 64] = [
        80, 135, 29, 146, 77, 44, 143, 128, 163, 252, 81, 143, 166, 63, 226, 36, 141, 3, 228, 13,
        148, 79, 254, 63, 205, 108, 207, 119, 143, 144, 239, 113, 132, 77, 26, 223, 64, 27, 231,
        166, 172, 138, 176, 95, 34, 250, 32, 198, 166, 209, 20, 72, 79, 70, 217, 131, 69, 228, 53,
        247, 64, 161, 98, 113,
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
        withdraw::withdraw_owner(ctx, transfer_amount)?;

        Ok(())
    }
}
