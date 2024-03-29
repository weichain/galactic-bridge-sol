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

    // 04de48381e1b54e2463cafdcafc3aaf7d99b1c512a16ac60e6415514d07ab78d6010b31fc919cc196b82ede54859f1d9cd69258f83b5d5bb146a77f326b9a723ab
    const ETH_PUBKEY: [u8; 64] = [
        222, 72, 56, 30, 27, 84, 226, 70, 60, 175, 220, 175, 195, 170, 247, 217, 155, 28, 81, 42,
        22, 172, 96, 230, 65, 85, 20, 208, 122, 183, 141, 96, 16, 179, 31, 201, 25, 204, 25, 107,
        130, 237, 229, 72, 89, 241, 217, 205, 105, 37, 143, 131, 181, 213, 187, 20, 106, 119, 243,
        38, 185, 167, 35, 171,
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
