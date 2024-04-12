import * as anchor from "@coral-xyz/anchor";
import { SolanaTreasury } from "../target/types/solana_treasury";
import { Keypair, PublicKey } from "@solana/web3.js";
import { assert } from "chai";
import { ethers } from "ethers";
import * as crypto from "crypto";

describe("Treasury", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const wallet = provider.wallet as anchor.Wallet;
  const connection = provider.connection;

  const idl = JSON.parse(
    require("fs").readFileSync("./target/idl/solana_treasury.json", "utf8")
  );
  const programId = new anchor.web3.PublicKey(
    "AAJL4DeXnWBNRowWjvpkAgwtAACpz6NfaA1T2p8Hrpy"
  );
  const program = new anchor.Program(
    idl,
    programId
  ) as anchor.Program<SolanaTreasury>;

  // PDA for the Treasury Vault
  const [treasuryPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("treasury")],
    program.programId
  );

const coupon = {
    from_icp_address:
      "pvmak-bbryo-hipdn-slp5u-fpsh5-tkf7f-v2wss-534um-jc454-ommhu-2qe",
    to_sol_address: "8nZLXraZUARNmU3P8PKbJMS7NYs7aEyw6d1aQx1km3t2",
    amount: 1000000000,
    burn_id: 2,
    burn_timestamp: "1712324887934495453",
    icp_burn_block_index: 11,
  };

  const couponHash =
    "0x" + "cb1009a185283a15e7804979d7b2c4a9ecc0ae4085531246264c5af4fb51e99d";
  const sig =
    "0x" +
    "c117dfb3da43ae5679bca836a689798bed3dbdaca25d51273aeaa60550c9e4141fce1d84a4231b4ccc85b73e6f28448fe57410732a1b612f28ee7117785a9220";
  const recoveryId = 0;

  const sigHashed = crypto
    .createHash("sha256")
    .update(ethers.toBeArray(sig))
    .digest();

  const sigHashedBytes = sigHashed.toJSON().data;
  const hashedSignaturePubkey = new PublicKey(sigHashedBytes);
  const [signaturePda] = PublicKey.findProgramAddressSync(
    [hashedSignaturePubkey.toBuffer()],
    program.programId
  );
  const receiverPubkey = new PublicKey(coupon.to_sol_address);

  before(async () => {
    await rentExemptReceiverAccountOK();
  });

  it("Deposit SOL and check event", async () => {
    const data = {
      addressIcp:
        "pvmak-bbryo-hipdn-slp5u-fpsh5-tkf7f-v2wss-534um-jc454-ommhu-2qe",
      amount: "10000000000",
    };
    const walletBalanceInitial = await connection.getBalance(wallet.publicKey);

    // Add listener for DepositEvent and check event details
    const listener = program.addEventListener(
      "DepositEvent",
      (event, context) => {
        assert.equal(
          event.addressIcp,
          data.addressIcp,
          "Deposited ICP address doesn't match expected address"
        );
        assert.equal(
          event.amount.toString(),
          data.amount,
          "Deposited amount doesn't match expected amount"
        );
        program.removeEventListener(listener);
      }
    );

    const latestBlockHash = await connection.getLatestBlockhash();
    const methodBuilder = program.methods
      .deposit({
        addressIcp: data.addressIcp,
        amount: new anchor.BN(data.amount),
      })
      .accounts({
        payer: wallet.publicKey,
        treasury: treasuryPDA,
      });

    const tx = await methodBuilder.transaction();
    tx.recentBlockhash = latestBlockHash.blockhash;
    tx.feePayer = wallet.publicKey;
    const fee = await tx.getEstimatedFee(connection);

    await methodBuilder.rpc();

    let pdaAccountInfo = await getTreasuryPDA();
    let walletBalance = await connection.getBalance(wallet.publicKey);
    const walletBalanceAfter =
      walletBalanceInitial - parseInt(data.amount) - fee;

    // Assert values with informative messages
    assert(
      pdaAccountInfo.lamports === parseInt(data.amount),
      `Treasury PDA doesn't contain deposited amount (${parseInt(data.amount)})`
    );
    assert(
      walletBalance === walletBalanceAfter,
      `Wallet balance doesn't reflect expected deduction (${walletBalanceAfter})`
    );
  });

  it("Fails to withdraw due to invalid coupon", async () => {
    const couponScam = {
      ...coupon,
      amount: "99999999",
    };

    try {
      await program.methods
        .withdraw({
          message: Buffer.from(ethers.toBeArray(couponHash)),
          signature: Buffer.from(ethers.toBeArray(sig)).toJSON().data,
          coupon: {
            fromIcpAddress: couponScam.from_icp_address,
            toSolAddress: couponScam.to_sol_address,
            amount: new anchor.BN(couponScam.amount),
            burnId: new anchor.BN(couponScam.burn_id),
            burnTimestamp: couponScam.burn_timestamp,
            icpBurnBlockIndex: new anchor.BN(couponScam.icp_burn_block_index),
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
      // No assertion here, as an error is expected
    } catch (error) {
      const code = error.error.errorCode.code;
      // Assert specific error code with informative message
      assert(
        code === "InvalidCouponHash",
        `Expected error with code 'InvalidCouponHash' but got '${code}'`
      );
      return;
    }
    assert(false, "Expected to error out with InvalidCouponHash");
  });

  it("Fails to withdraw due to invalid signature", async () => {
    const sigScam =
      "0x" +
      "fff722f41eb1cae151458c2d9acf16695984d1376a6a0a6ab56a385204f889370aec600906f278c5d9522d1df16ab50940827f96d7f62f61cd2ba33b28f2b7df";

    try {
      await program.methods
        .withdraw({
          message: Buffer.from(ethers.toBeArray(couponHash)),
          signature: Buffer.from(ethers.toBeArray(sigScam)).toJSON().data,
          coupon: {
            fromIcpAddress: coupon.from_icp_address,
            toSolAddress: coupon.to_sol_address,
            amount: new anchor.BN(coupon.amount),
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
    } catch (error) {
      // Assert specific error code with informative message
      assert(
        error.error.errorCode.code === "InvalidSignature",
        `Expected error with code 'InvalidSignature' but got '${error.error.errorCode.code}'`
      );
      return;
    }
    assert(false, "Expected to error out with InvalidSignature");
  });

  it("Fails to withdraw due to invalid coupon hash", async () => {
    const scamCouponHash =
      "0x" + "01a9dd358a821b90a0523cbbb3b2ad3fbd8be75e09b132c5c129b65589774c9d";

    try {
      await program.methods
        .withdraw({
          message: Buffer.from(ethers.toBeArray(scamCouponHash)),
          signature: Buffer.from(ethers.toBeArray(sig)).toJSON().data,
          coupon: {
            fromIcpAddress: coupon.from_icp_address,
            toSolAddress: coupon.to_sol_address,
            amount: new anchor.BN(coupon.amount),
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
    } catch (error) {
      // Assert specific error code with informative message
      assert(
        error.error.errorCode.code ===
          program.idl.types[3].type.variants[0].name,
        `Expected error with code '${program.idl.types[3].type.variants[0].name}' but got '${error.error.errorCode.code}'`
      );
      return;
    }
    assert(false, "Expected to error out with InvalidCouponHash");
  });

  it("Fails to withdraw due to invalid signature pubkey", async () => {
    const sigScam =
      "0x" +
      "fff722f41eb1cae151458c2d9acf16695984d1376a6a0a6ab56a385204f889370aec600906f278c5d9522d1df16ab50940827f96d7f62f61cd2ba33b28f2b7df";
    const sigHashedScam = crypto
      .createHash("sha256")
      .update(ethers.toBeArray(sigScam))
      .digest();
    const sigHashedBytesScam = sigHashedScam.toJSON().data;
    const hashedSignaturePubkeyScam = new PublicKey(sigHashedBytesScam);

    try {
      await program.methods
        .withdraw({
          message: Buffer.from(ethers.toBeArray(couponHash)),
          signature: Buffer.from(ethers.toBeArray(sig)).toJSON().data,
          coupon: {
            fromIcpAddress: coupon.from_icp_address,
            toSolAddress: coupon.to_sol_address,
            amount: new anchor.BN(coupon.amount),
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
          hashedSignaturePubkey: hashedSignaturePubkeyScam,
          signaturePda: signaturePda,
        })
        .rpc();
    } catch (error) {
      const code = error.error.errorCode.code;
      // Assert specific error code with informative message
      assert(
        code === "ConstraintSeeds",
        `Expected error with code 'ConstraintSeeds' but got '${code}'`
      );
      return;
    }

    assert(false, "Expected to error out with ConstraintSeeds");
  });

  it("Fails to withdraw due to invalid signature pda", async () => {
    const sigScam =
      "0x" +
      "fff722f41eb1cae151458c2d9acf16695984d1376a6a0a6ab56a385204f889370aec600906f278c5d9522d1df16ab50940827f96d7f62f61cd2ba33b28f2b7df";
    const sigHashedScam = crypto
      .createHash("sha256")
      .update(ethers.toBeArray(sigScam))
      .digest();
    const sigHashedBytesScam = sigHashedScam.toJSON().data;
    const hashedSignaturePubkeyScam = new PublicKey(sigHashedBytesScam);
    const [signaturePdaScam] = PublicKey.findProgramAddressSync(
      [hashedSignaturePubkeyScam.toBuffer()],
      program.programId
    );

    try {
      await program.methods
        .withdraw({
          message: Buffer.from(ethers.toBeArray(couponHash)),
          signature: Buffer.from(ethers.toBeArray(sig)).toJSON().data,
          coupon: {
            fromIcpAddress: coupon.from_icp_address,
            toSolAddress: coupon.to_sol_address,
            amount: new anchor.BN(coupon.amount),
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
          signaturePda: signaturePdaScam,
        })
        .rpc();
    } catch (error) {
      const code = error.error.errorCode.code;
      // Assert specific error code with informative message
      assert(
        code === "ConstraintSeeds",
        `Expected error with code 'ConstraintSeeds' but got '${code}'`
      );
      return;
    }

    assert(false, "Expected to error out with ConstraintSeeds");
  });

  it("Fails to withdraw due to invalid signature pubkey and pda", async () => {
    const sigScam =
      "0x" +
      "fff722f41eb1cae151458c2d9acf16695984d1376a6a0a6ab56a385204f889370aec600906f278c5d9522d1df16ab50940827f96d7f62f61cd2ba33b28f2b7df";
    const sigHashedScam = crypto
      .createHash("sha256")
      .update(ethers.toBeArray(sigScam))
      .digest();
    const sigHashedBytesScam = sigHashedScam.toJSON().data;
    const hashedSignaturePubkeyScam = new PublicKey(sigHashedBytesScam);
    const [signaturePdaScam] = PublicKey.findProgramAddressSync(
      [hashedSignaturePubkeyScam.toBuffer()],
      program.programId
    );

    try {
      await program.methods
        .withdraw({
          message: Buffer.from(ethers.toBeArray(couponHash)),
          signature: Buffer.from(ethers.toBeArray(sig)).toJSON().data,
          coupon: {
            fromIcpAddress: coupon.from_icp_address,
            toSolAddress: coupon.to_sol_address,
            amount: new anchor.BN(coupon.amount),
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
          hashedSignaturePubkey: hashedSignaturePubkeyScam,
          signaturePda: signaturePdaScam,
        })
        .rpc();
    } catch (error) {
      const code = error.error.errorCode.code;
      // Assert specific error code with informative message
      assert(
        code === "KeysDontMatch",
        `Expected error with code 'KeysDontMatch' but got '${code}'`
      );
      return;
    }

    assert(false, "Expected to error out with KeysDontMatch");
  });

  it("Fails to withdraw due to incorrect recovery id", async () => {
    const recoveryId = 1;

    try {
      await program.methods
        .withdraw({
          message: Buffer.from(ethers.toBeArray(couponHash)),
          signature: Buffer.from(ethers.toBeArray(sig)).toJSON().data,
          coupon: {
            fromIcpAddress: coupon.from_icp_address,
            toSolAddress: coupon.to_sol_address,
            amount: new anchor.BN(coupon.amount),
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
    } catch (error) {
      const code = error.error.errorCode.code;
      // Assert specific error code with informative message
      assert(
        code === "InvalidSignature",
        `Expected error with code 'InvalidSignature' but got '${code}'`
      );
      return;
    }

    assert(false, "Expected to error out with InvalidSignature");
  });

  it("Fails to withdraw due to receiver mismatch", async () => {
    try {
      await program.methods
        .withdraw({
          message: Buffer.from(ethers.toBeArray(couponHash)),
          signature: Buffer.from(ethers.toBeArray(sig)).toJSON().data,
          coupon: {
            fromIcpAddress: coupon.from_icp_address,
            toSolAddress: coupon.to_sol_address,
            amount: new anchor.BN(coupon.amount),
            burnId: new anchor.BN(coupon.burn_id),
            burnTimestamp: coupon.burn_timestamp,
            icpBurnBlockIndex: new anchor.BN(coupon.icp_burn_block_index),
          },
          recoveryId,
        })
        .accounts({
          payer: wallet.publicKey,
          receiver: treasuryPDA,
          treasury: treasuryPDA,
          hashedSignaturePubkey: hashedSignaturePubkey,
          signaturePda: signaturePda,
        })
        .rpc();
    } catch (error) {
      const code = error.error.errorCode.code;
      // Assert specific error code with informative message
      assert(
        code === "ReceiverMismatch",
        `Expected error with code 'ReceiverMismatch' but got '${code}'`
      );
      return;
    }

    assert(false, "Expected to error out with ReceiverMismatch");
  });

  it("Withdraws with valid signature and data", async () => {
    const pdaLamportsInitial = (await getTreasuryPDA()).lamports;
    const walletBalanceInitial = await connection.getBalance(receiverPubkey);

    await program.methods
      .withdraw({
        message: Buffer.from(ethers.toBeArray(couponHash)),
        signature: Buffer.from(ethers.toBeArray(sig)).toJSON().data,
        coupon: {
          fromIcpAddress: coupon.from_icp_address,
          toSolAddress: coupon.to_sol_address,
          amount: new anchor.BN(coupon.amount),
          burnId: new anchor.BN(coupon.burn_id),
          burnTimestamp: coupon.burn_timestamp,
          icpBurnBlockIndex: new anchor.BN(coupon.icp_burn_block_index),
        },
        recoveryId,
      })
      .accounts({
        payer: wallet.publicKey,
        receiver: receiverPubkey,
        treasury: treasuryPDA,
        hashedSignaturePubkey: hashedSignaturePubkey,
        signaturePda: signaturePda,
      })
      .rpc();

    const pdaLamports = (await getTreasuryPDA()).lamports;
    const pdaLamportsExpected = pdaLamportsInitial - coupon.amount;
    const walletBalance = await connection.getBalance(receiverPubkey);
    const fee = 902816;
    const walletBalanceExpected = walletBalanceInitial + coupon.amount - fee;

    // Assert treasury PDA balance with informative message
    assert(
      pdaLamports === pdaLamportsExpected,
      `Treasury PDA balance (${pdaLamports}) doesn't reflect expected decrease after withdrawal (${pdaLamportsExpected})`
    );

    // Assert wallet balance with informative message
    // assert(
    //   walletBalance === walletBalanceExpected,
    //   `Wallet balance (${walletBalance}) doesn't reflect expected increase after withdrawal (${walletBalanceExpected})`
    // );
  });

  it("Fails to withdraw due to used signature", async () => {
    try {
      await program.methods
        .withdraw({
          message: Buffer.from(ethers.toBeArray(couponHash)),
          signature: Buffer.from(ethers.toBeArray(sig)).toJSON().data,
          coupon: {
            fromIcpAddress: coupon.from_icp_address,
            toSolAddress: coupon.to_sol_address,
            amount: new anchor.BN(coupon.amount),
            burnId: new anchor.BN(coupon.burn_id),
            burnTimestamp: coupon.burn_timestamp,
            icpBurnBlockIndex: new anchor.BN(coupon.icp_burn_block_index),
          },
          recoveryId,
        })
        .accounts({
          payer: wallet.publicKey,
          receiver: receiverPubkey,
          treasury: treasuryPDA,
          hashedSignaturePubkey: hashedSignaturePubkey,
          signaturePda: signaturePda,
        })
        .rpc();
    } catch (error) {
      const code = error.error.errorCode.code;
      // Assert specific error code with informative message
      assert(
        code === "SignatureUsed",
        `Expected error with code 'SignatureUsed' but got '${code}'`
      );
      return;
    }

    assert(false, "Expected to error out with SignatureUsed");
  });

  const getTreasuryPDA = async () => {
    return program.provider.connection.getAccountInfo(treasuryPDA);
  };

  const rentExemptReceiverAccountOK = async () => {
    const walletBalanceInitial = await connection.getBalance(receiverPubkey);
    const minBalance = await connection.getMinimumBalanceForRentExemption(1);
    const isRentExempt = walletBalanceInitial >= minBalance;
    if (!isRentExempt) {
      const transaction = new anchor.web3.Transaction().add(
        anchor.web3.SystemProgram.transfer({
          fromPubkey: wallet.publicKey,
          toPubkey: receiverPubkey,
          lamports: minBalance,
        })
      );
      await provider.sendAndConfirm(transaction, [wallet.payer]);
    }
  };
});
