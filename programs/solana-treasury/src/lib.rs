use anchor_lang::prelude::*;

pub mod utils;

pub mod deposit;
use deposit::*;

pub mod withdraw;
use withdraw::*;

declare_id!("3PxEqHbGAWZthkyuJvtTjjwYSQ3HRGJVyk8MbjnZP2mt");

#[program]
pub mod solana_treasury {
    use super::*;
    
    const ETH_PUBKEY: [u8; 64] = [
        103, 195,  88, 222,  59, 129,  88,  22, 117, 109, 111,
         44, 176,  82,  12, 162,  43, 102,  11,  40,  45, 232,
        229, 153, 222, 131, 162, 180, 187,  47,  96, 171, 145,
        123, 189, 254,  81,  78, 224, 252,  29, 180, 157,  53,
        206, 225,  54, 199,   6, 242, 238, 217,  95, 117, 170,
         68,  71, 185, 108, 206, 181, 188, 172,  87
    ];

    pub fn deposit(ctx: Context<DepositCtx>, data: DepositData) -> Result<()> {
        deposit::deposit(ctx, data)?;
    
        Ok(())
    }

    pub fn withdraw(ctx: Context<WithdrawCtx>, data: WithdrawData) -> Result<()> {
        withdraw::withdraw(ctx, data, ETH_PUBKEY)?;

        Ok(())
    }
}
