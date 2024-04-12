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

    // 04d0b2fc6a0674a6f45daf899a6dd0ac4181f2df03779a2a5b2c94ac2a76d93a6d0c13a37186bf4f70999cd4bd59345576931329271ee9b601e7c850d79dd01261
    const ETH_PUBKEY: [u8; 64] = [
        208, 178, 252, 106, 6, 116, 166, 244, 93, 175, 137, 154, 109, 208, 172, 65, 129, 242, 223,
        3, 119, 154, 42, 91, 44, 148, 172, 42, 118, 217, 58, 109, 12, 19, 163, 113, 134, 191, 79,
        112, 153, 156, 212, 189, 89, 52, 85, 118, 147, 19, 41, 39, 30, 233, 182, 1, 231, 200, 80,
        215, 157, 208, 18, 97,
    ];

    pub fn deposit(ctx: Context<Deposit>, data: DepositData) -> Result<()> {
        deposit::deposit(ctx, data)?;

        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>, data: WithdrawData) -> Result<()> {
        withdraw::withdraw(ctx, data, ETH_PUBKEY)?;

        Ok(())
    }
}
