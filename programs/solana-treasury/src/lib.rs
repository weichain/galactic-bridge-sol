use anchor_lang::prelude::*;
use solana_program::secp256k1_recover::{secp256k1_recover};
use k256;
use k256::ecdsa::signature::Verifier;

declare_id!("3PxEqHbGAWZthkyuJvtTjjwYSQ3HRGJVyk8MbjnZP2mt");

#[program]
pub mod solana_treasury {
    use super::*;

    pub fn verify(
        ctx: Context<New>,
        // signature_hex: String,
        // message: String,
        // public_key_hex: String,
    ) -> Result<()> {
        let public_key_hex = "026f0a0eac8db33cebd88516ccbfafc148cd97abfe217e456c4f47f0478b1b443d";

        let message = "69ee7a3423fa9be01fa80a47dffc9c3135fdccaab0ca5d5c4fbc3459b66c271e";

        let signature_hex = "5bf05d6ede6316f675a3d0ad0896db0473aaa6084a1c373046fc5ea2a285edd81b0dfc8c5bb6bb0affff58fbc4c16f73b757414b0af05ab4bc139864903bb81b";
        
        let signature_bytes = hex::decode(&signature_hex).expect("failed to hex-decode signature");
        let pubkey_bytes = hex::decode(&public_key_hex).expect("failed to hex-decode public key");
        let message_bytes = message.as_bytes();

        let signature = k256::ecdsa::Signature::try_from(signature_bytes.as_slice())
            .expect("failed to deserialize signature");
        let is_signature_valid = k256::ecdsa::VerifyingKey::from_sec1_bytes(&pubkey_bytes)
            .expect("failed to deserialize sec1 encoding into public key")
            .verify(message_bytes, &signature)
            .is_ok();

        Ok(())
    }

    pub fn recover(ctx: Context<New>) -> Result<()> {
        let eth_pubkey = "026f0a0eac8db33cebd88516ccbfafc148cd97abfe217e456c4f47f0478b1b443d";

        // ethers.solidityPackedKeccak256(['string'],["some_message"])
        let message = "69ee7a3423fa9be01fa80a47dffc9c3135fdccaab0ca5d5c4fbc3459b66c271e";

        // Buffer.concat([sig.r, sig.s]).toString('hex'))
        let signature = "5bf05d6ede6316f675a3d0ad0896db0473aaa6084a1c373046fc5ea2a285edd81b0dfc8c5bb6bb0affff58fbc4c16f73b757414b0af05ab4bc139864903bb81b";
        
        // sig.v - 27
        let recovery_id = 1;

        let recovered_pubkey = secp256k1_recover(
            &message.as_bytes(),
            recovery_id,
            &signature.as_bytes(),
        )
        .map_err(|_| ProgramError::InvalidArgument)?;

        // 58a8a3bd63db626497e1b4c09fb3119257c2bd0c651084eac0c038ad49bec874e380efbb5f8232aceae2383b9a1bbc22e936121ebaf83ff880801232327380e3
        let recovered_pubkey_hex = hex::encode(recovered_pubkey.0);

        msg!("Generated Recovered PubKey: {}", recovered_pubkey_hex);

        if eth_pubkey == recovered_pubkey_hex {
            msg!("Public Key Match!");
        } else {
            msg!("Public Key Doesn't Match!");
        }
        // value from recovered_pubkey_hex:
        // 58a8a3bd63db626497e1b4c09fb3119257c2bd0c651084eac0c038ad49bec874e380efbb5f8232aceae2383b9a1bbc22e936121ebaf83ff880801232327380e3

        // eth_pubkey should equals to recovered_pubkey_hex ?

        Ok(())
    }
}

#[derive(Accounts)]
pub struct New {}
