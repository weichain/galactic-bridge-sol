import * as anchor from "@coral-xyz/anchor";
import { SolanaTreasury } from "../target/types/solana_treasury";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { assert } from "chai";
import { ethers } from "ethers";
import * as crypto from "crypto";

describe("Treasury", async () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const wallet = provider.wallet as anchor.Wallet;
  const connection = provider.connection;
  const fs = require("fs");
  const idl = JSON.parse(
    fs.readFileSync("./target/idl/solana_treasury.json", "utf8")
  );
  // const programId = new anchor.web3.PublicKey(
  //   "AAJL4DeXnWBNRowWjvpkAgwtAACpz6NfaA1T2p8Hrpy"
  // );

  const keypairBuffer = JSON.parse(
    fs.readFileSync("./target/deploy/solana_treasury-keypair.json", "utf8")
  );
  const programKeypair = anchor.web3.Keypair.fromSecretKey(
    new Uint8Array(keypairBuffer)
  );
  const programId = programKeypair.publicKey;

  const program = new anchor.Program(
    idl,
    programId
  ) as anchor.Program<SolanaTreasury>;

  // const programAccountInfo = await connection.getParsedAccountInfo(programId);
  // const programData = (programAccountInfo.value.data as any).parsed.info
  //   .programData;
  // console.log("programData", programData);

  // PDA for the Treasury Vault
  const [treasuryPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("treasury")],
    program.programId
  );

  const coupon = {
    from_icp_address:
      "pvmak-bbryo-hipdn-slp5u-fpsh5-tkf7f-v2wss-534um-jc454-ommhu-2qe",
    to_sol_address: "8nZLXraZUARNmU3P8PKbJMS7NYs7aEyw6d1aQx1km3t2",
    amount: "10_000_000",
    burn_id: 0,
    burn_timestamp: "1716994668977025165",
    icp_burn_block_index: 2,
  };

  const couponHash =
    "0x" + "153e935d5ba866812c6ae00095c9f765df08aee57df63dc638d2e888bd92cf4a";
  const sig =
    "0x" +
    "02f0d597f3bbaf02efb1d42ebd3e725317d99c94cc1315fadf2195471f90ee6a69dc667a11188e67e3a126048a2f1454e102f23fba83e2ea04ee439ebc88ed5a";
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
      amount: "50000000000",
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
      amount: "99_999_999",
    };

    try {
      await program.methods
        .withdraw({
          message: Buffer.from(ethers.toBeArray(couponHash)),
          signature: Buffer.from(ethers.toBeArray(sig)).toJSON().data,
          coupon: {
            fromIcpAddress: couponScam.from_icp_address,
            toSolAddress: couponScam.to_sol_address,
            amount: couponScam.amount,
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
    } catch (error) {
      // Assert specific error code with informative message
      // assert(
      //   error.error.errorCode.code ===
      //     program.idl.types[3].type.variants[0].name,
      //   `Expected error with code '${program.idl.types[3].type.variants[0].name}' but got '${error.error.errorCode.code}'`
      // );
      // throw new Error(error.error.errorCode.code);

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
            amount: coupon.amount,
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
          amount: coupon.amount,
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

    const pdaLamports = new anchor.BN((await getTreasuryPDA()).lamports);
    const amount = new anchor.BN(coupon.amount.replace(/_/g, ""));
    const pdaLamportsExpected = new anchor.BN(pdaLamportsInitial).sub(amount);

    // Assert treasury PDA balance with informative message
    assert(
      pdaLamports.eq(pdaLamportsExpected),
      `Treasury PDA balance (${pdaLamports}) doesn't reflect expected decrease after withdrawal (${pdaLamportsExpected})`
    );

    // const walletBalance = await connection.getBalance(receiverPubkey);
    // const fee = new anchor.BN("902816");
    // const walletBalanceExpected = new anchor.BN(walletBalanceInitial)
    //   .add(amount)
    //   .sub(fee);

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
            amount: coupon.amount,
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

  it("Set Withdraw Owner Interval", async () => {
    const [withdrawOwnerIntervalPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("withdraw_owner_interval")],
      program.programId
    );
    const currentSlot = await provider.connection.getSlot();
    const slotStart = new anchor.BN(currentSlot + 15);
    const intervalDuration = new anchor.BN("1000");

    await program.methods
      .setWithdrawOwnerInterval({
        slotStart,
        intervalDuration,
      })
      .accounts({
        owner: wallet.publicKey,
        withdrawOwnerInterval: withdrawOwnerIntervalPDA,
      })
      .rpc();
  });

  it("Withdraws Owner", async () => {
    const [withdrawOwnerIntervalPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("withdraw_owner_interval")],
      program.programId
    );

    const withdrawOwnerIntervalInfo =
      program.provider.connection.getAccountInfo(withdrawOwnerIntervalPDA);

    // Assuming withdrawOwnerIntervalInfo is an AccountInfo object
    const data = (await withdrawOwnerIntervalInfo).data;

    const slotStart = data.readBigInt64LE(8);
    const intervalDuration = data.readBigInt64LE(16);
    console.log("Slot Start:", slotStart.toString());
    console.log("Interval Duration:", intervalDuration.toString());

    let isOk = false;
    while (!isOk) {
      const currentSlot = await provider.connection.getSlot();
      try {
        await program.methods
          .withdrawOwner(new anchor.BN("1000000000"))
          .accounts({
            owner: wallet.publicKey,
            receiver: wallet.publicKey,
            withdrawOwnerInterval: withdrawOwnerIntervalPDA,
            treasury: treasuryPDA,
          })
          .rpc();

        isOk = true;
        console.log("Ok at slot", currentSlot);
      } catch (error) {
        console.error("Failed at slot", currentSlot);
        const sleep = (ms: number) =>
          new Promise((resolve) => setTimeout(resolve, ms));
        await sleep(1000);
      }
    }
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
