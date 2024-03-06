use anchor_lang::prelude::*;

pub mod utils;

pub mod deposit;
use deposit::*;

pub mod withdraw;
use withdraw::*;

declare_id!("HS6NTv6GBVSLct8dsimRWRvjczJTAgfgDJt8VpR8wtGm");

#[program]
pub mod solana_treasury {
    use super::*;
    
    // 69b3e4f4295275d99217c8d4f31a872d7af55c671fde7b0ed293650f9d1a41155547644c9958888110145c9846d85863665d62398e53bed8f5727f5508cd0bb2
    const ETH_PUBKEY: [u8; 64] = [
        105, 179, 228, 244,  41,  82, 117, 217, 146, 23, 200,
        212, 243,  26, 135,  45, 122, 245,  92, 103, 31, 222,
        123,  14, 210, 147, 101,  15, 157,  26,  65, 21,  85,
         71, 100,  76, 153,  88, 136, 129,  16,  20, 92, 152,
         70, 216,  88,  99, 102,  93,  98,  57, 142, 83, 190,
        216, 245, 114, 127,  85,   8, 205,  11, 178
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
