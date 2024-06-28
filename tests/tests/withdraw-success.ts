import * as anchor from "@coral-xyz/anchor";
import { assert } from "chai";
import { ethers } from "ethers";

export const withdrawWithValidSignatureAndData = async ({
  program,
  couponHash,
  sig,
  coupon,
  recoveryId,
  wallet,
  receiverPubkey,
  treasuryPDA,
  hashedSignaturePubkey,
  signaturePda,
}) => {
  const treasuryInfoInitial = await program.provider.connection.getAccountInfo(
    treasuryPDA
  );
  try {
    await program.methods
      .withdraw({
        message: Buffer.from(ethers.toBeArray(couponHash)),
        signature: Buffer.from(ethers.toBeArray(sig)).toJSON().data,
        coupon: {
          fromIcpAddress: coupon.from_icp_address,
          toSolAddress: coupon.to_sol_address,
          amount: coupon.amount,
          burnId: new anchor.BN(coupon.burn_id),
          burnTimestamp: coupon.burn_timestamp,
          icpBurnBlockIndex: new anchor.BN(coupon.icp_burn_block_index),
        },
        recoveryId: recoveryId,
      })
      .accounts({
        payer: wallet.publicKey,
        receiver: receiverPubkey,
        treasury: treasuryPDA,
        hashedSignaturePubkey: hashedSignaturePubkey,
        signaturePda: signaturePda,
      })
      .rpc();
    const treasuryInfoAfter = await program.provider.connection.getAccountInfo(
      treasuryPDA
    );
    const pdaLamports = new anchor.BN(treasuryInfoAfter.lamports);
    const amount = new anchor.BN(coupon.amount.replace(/_/g, ""));
    const pdaLamportsInitial = new anchor.BN(treasuryInfoInitial.lamports);
    const pdaLamportsExpected = pdaLamportsInitial.sub(amount);

    // Assert treasury PDA balance with informative message
    assert(
      pdaLamports.eq(pdaLamportsExpected),
      `Treasury PDA balance (${pdaLamports}) doesn't reflect expected decrease after withdrawal (${pdaLamportsExpected})`
    );
  } catch (error) {
    assert(
      false,
      `Expected successful withdrawal but got an error: ${error.message}`
    );
  }
};
