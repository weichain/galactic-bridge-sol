use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};
use solana_program::secp256k1_recover::secp256k1_recover;
use solana_program::hash::hash;

declare_id!("3PxEqHbGAWZthkyuJvtTjjwYSQ3HRGJVyk8MbjnZP2mt");

#[program]
pub mod solana_treasury {
    use super::*;

    pub fn deposit(ctx: Context<DepositCtx>, amount: u64) -> Result<()> {
        transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.payer.to_account_info(),
                    to: ctx.accounts.treasury.to_account_info(),
                },
            ),
            amount,
        )?;

        emit!(DepositEvent {
            sender: *ctx.accounts.payer.to_account_info().key,
            amount: amount,
        });

        Ok(())
    }

    pub fn withdraw(ctx: Context<WithdrawCtx>, amount: u64) -> Result<()> {
        // PDA signer seeds
        let signer_seeds: &[&[&[u8]]] = &[&[b"treasury", &[ctx.bumps.treasury]]];
    
        // Create the new account, transferring lamports from the rent vault to the new account
        transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.treasury.to_account_info(),
                    to: ctx.accounts.receiver.to_account_info(),
                },
                signer_seeds
            ),
            amount,
        )?;

        Ok(())
    }

    const ETH_PUBKEY: [u8; 64] = [
        103, 195,  88, 222,  59, 129,  88,  22, 117, 109, 111,
         44, 176,  82,  12, 162,  43, 102,  11,  40,  45, 232,
        229, 153, 222, 131, 162, 180, 187,  47,  96, 171, 145,
        123, 189, 254,  81,  78, 224, 252,  29, 180, 157,  53,
        206, 225,  54, 199,   6, 242, 238, 217,  95, 117, 170,
         68,  71, 185, 108, 206, 181, 188, 172,  87
    ];
    
    pub fn verify(_ctx: Context<New>, data: VerificationData) -> Result<()> {
        let message = format!(
            r#"{{"address":"{}","amount":{}}}"#,
            data.verify_data.address.clone(),
            data.verify_data.amount
        );

        let msg_data_hashed = hash(&message.as_bytes());

        if data.message != msg_data_hashed.to_bytes() {
            msg!("MSG Dont Match");
            return err!(ValidationError::InvalidDataHash)
        }

        let mut is_match = false;

        // Attempt recovery with both valid recovery IDs (0 and 1)
        for recovery_id in [0, 1] {
            let recovered_pubkey = secp256k1_recover(
                &data.message,
                recovery_id,
                &data.signature
            )
            .map_err(|_| ProgramError::InvalidArgument)?;
    
            if &ETH_PUBKEY == &recovered_pubkey.0 {
                is_match = true;
            }
        }

        if !is_match {
            msg!("Sig Not valid");
            return err!(ValidationError::InvalidSignature);
        }

        Ok(())
    }

}

#[derive(Accounts)]
pub struct New {}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct DataToVerify{
    address: String,
    amount: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct VerificationData {
    message: Vec<u8>,
    signature: [u8; 64],
    verify_data: DataToVerify
} 

#[error_code]
pub enum ValidationError {
    #[msg("Message does not match 'verify_data' message hash")]
    InvalidDataHash,
    #[msg("Signature does not match public key")]
    InvalidSignature,
}

#[event]
pub struct DepositEvent {
    pub sender: Pubkey,
    pub amount: u64
}

#[derive(Accounts)]
pub struct DepositCtx<'info> {
    #[account(mut)]
    payer: Signer<'info>,

    #[account(
        mut,
        seeds = [
            b"treasury",
        ],
        bump,
    )]
    treasury: SystemAccount<'info>,
    system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct WithdrawCtx<'info> {
    #[account(mut)]
    /// CHECK: this is unsafe
    receiver: AccountInfo<'info>,

    #[account(
        mut,
        seeds = [
            b"treasury",
        ],
        bump,
    )]
    treasury: SystemAccount<'info>,
    system_program: Program<'info, System>,
}
