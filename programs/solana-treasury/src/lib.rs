use anchor_lang::prelude::*;

pub mod utils;
pub mod storage;

pub mod deposit;
use deposit::*;

pub mod withdraw;
use withdraw::*;



declare_id!("HS6NTv6GBVSLct8dsimRWRvjczJTAgfgDJt8VpR8wtGm");

#[program]
pub mod solana_treasury {
    use super::*;

    // ccf59acab5758755cd1e06c5143d3727904b268579b24f948fabd6753d3ee143cdf4b76334aeb51b758cba5755253f48a341294f11c14fe018046243774f3f30
    const ETH_PUBKEY: [u8; 64] = [
        204, 245, 154, 202, 181, 117, 135,  85, 205,  30,   6,
        197,  20,  61,  55,  39, 144,  75,  38, 133, 121, 178,
         79, 148, 143, 171, 214, 117,  61,  62, 225,  67, 205,
        244, 183,  99,  52, 174, 181,  27, 117, 140, 186,  87,
         85,  37,  63,  72, 163,  65,  41,  79,  17, 193,  79,
        224,  24,   4,  98,  67, 119,  79,  63,  48
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
