use {
    anchor_lang::prelude::*,
    solana_program::{
        secp256k1_recover::{secp256k1_recover, Secp256k1Pubkey},
        hash::{hash, Hash}
    }
};

#[error_code]
pub enum ValidationError {
    #[msg("Message does not match 'verify_data' message hash")]
    InvalidDataHash,
    #[msg("Signature does not match public key")]
    InvalidSignature,
}

pub fn verify(
    eth_pubkey: &[u8; 64],
    msg: &Vec<u8>,
    sig: &[u8; 64],
    msg_address: &str,
    msg_amount: &u64,
    recovery_id: u8,
) -> Result<()> {
    let message: String = format!(
        r#"{{"address":"{}","amount":{}}}"#,
        msg_address.to_owned(),
        msg_amount
    );

    let msg_data_hashed: Hash = hash(message.as_bytes());

    if *msg != msg_data_hashed.to_bytes() {
        msg!("MSG Dont Match");
        return err!(ValidationError::InvalidDataHash)
    }

    let recovered_pubkey: Secp256k1Pubkey = secp256k1_recover(
        msg,
        recovery_id,
        sig
    )
    .map_err(|_| ProgramError::InvalidArgument)?;

    if *eth_pubkey != recovered_pubkey.0 {
        msg!("Sig Not valid");
        return err!(ValidationError::InvalidSignature);
    }

    Ok(())
}



