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

pub mod utils {
    use super::*;
    
    pub fn verify(eth_pubkey: &[u8; 64], msg: &Vec<u8>, sig: &[u8; 64], msg_address: &String, msg_amount: &u64) -> Result<()> {
        let message: String = format!(
            r#"{{"address":"{}","amount":{}}}"#,
            msg_address.clone(),
            msg_amount
        );
    
        let msg_data_hashed: Hash = hash(&message.as_bytes());
    
        if *msg != msg_data_hashed.to_bytes() {
            msg!("MSG Dont Match");
            return err!(ValidationError::InvalidDataHash)
        }
    
        let mut is_match = false;
    
        // Attempt recovery with both valid recovery IDs (0 and 1)
        for recovery_id in [0, 1] {
            let recovered_pubkey: Secp256k1Pubkey = secp256k1_recover(
                msg,
                recovery_id,
                sig
            )
            .map_err(|_| ProgramError::InvalidArgument)?;
    
            if *eth_pubkey == recovered_pubkey.0 {
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



