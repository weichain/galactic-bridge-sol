use {
    anchor_lang::prelude::*,
    solana_program::{
        secp256k1_recover::{secp256k1_recover, Secp256k1Pubkey},
        hash::{hash, Hash}
    }
};

#[error_code]
pub enum ValidationError {
    #[msg("Message does not match 'verify_data' coupon hash")]
    InvalidCouponHash,
    #[msg("Signature does not match public key")]
    InvalidSignature,
}

pub fn verify_message(
    msg: &[u8],
    id: &u64,
    from_icp_address: &str,
    to_sol_address: &str,
    amount: &u64,
    timestamp: &u64,
    icp_burn_block_index: &u64
) -> Result<()> {
    let message: String = format!(
        r#"{{"id":{},"from_icp_address":"{}","to_sol_address":"{}","amount":{},"timestamp":{},"icp_burn_block_index":{}}}"#,
        id,
        from_icp_address,
        to_sol_address,
        amount,
        timestamp,
        icp_burn_block_index
    );
    let msg_data_hashed: Hash = hash(message.as_bytes());

    if msg != msg_data_hashed.to_bytes() {
        return err!(ValidationError::InvalidCouponHash)
    }

    Ok(())
}

pub fn verify_signature(
    eth_pubkey: &[u8; 64],
    msg: &[u8],
    sig: &[u8; 64],
    recovery_id: u8,
) -> Result<()> {
    let recovered_pubkey: Secp256k1Pubkey = secp256k1_recover(
        msg,
        recovery_id,
        sig
    )
    .map_err(|_| ProgramError::InvalidArgument)?;

    if eth_pubkey != &recovered_pubkey.0 {
        return err!(ValidationError::InvalidSignature);
    }

    Ok(())
}



