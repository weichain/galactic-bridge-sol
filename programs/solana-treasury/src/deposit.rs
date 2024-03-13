use {
    anchor_lang::prelude::*,
    anchor_lang::system_program::{transfer, Transfer}
};


#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct DepositData{
    address_icp: String,
    amount: u64
}

#[error_code]
pub enum DepositError {
    #[msg("Payer is not signer")]
    PayerNotSigner,
    #[msg("Insufficient payer's amount")]
    PayerInsufficientAmount,
}

#[event]
pub struct DepositEvent {
    pub address_icp: String,
    pub amount: u64
}

#[derive(Accounts)]
pub struct Deposit<'info> {
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

pub fn deposit(ctx: Context<Deposit>, data: DepositData) -> Result<()> {
    if !ctx.accounts.payer.is_signer {
        return err!(DepositError::PayerNotSigner);
    }
    
    let transfer_amount = data.amount;
    let sender_balance = ctx.accounts.payer.lamports();
    if sender_balance < transfer_amount {
        return err!(DepositError::PayerInsufficientAmount);
    }

    transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.payer.to_account_info(),
                to: ctx.accounts.treasury.to_account_info(),
            },
        ),
        transfer_amount,
    )?;

    emit!(DepositEvent {
        address_icp: data.address_icp,
        amount: transfer_amount,
    });

    Ok(())
}