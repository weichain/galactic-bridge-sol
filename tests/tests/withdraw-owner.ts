import * as anchor from "@coral-xyz/anchor";
import { assert } from "chai";

export const setWithdrawOwnerInterval = async ({
  provider,
  program,
  wallet,
  withdrawOwnerIntervalPDA,
}) => {
  try {
    const currentSlot = await provider.connection.getSlot();
    const slotStart = new anchor.BN(currentSlot + 15);
    const intervalDuration = new anchor.BN("5");

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
  } catch (error) {
    assert(false, `Errored out with: ${error.message}`);
  }
};

export const setWithdrawOwnerIntervalFailsCallerNotOwner = async ({
  provider,
  program,
  wallet,
  withdrawOwnerIntervalPDA,
}) => {
  try {
    const currentSlot = await provider.connection.getSlot();
    const slotStart = new anchor.BN(currentSlot + 15);
    const intervalDuration = new anchor.BN("5");

    await program.methods
      .setWithdrawOwnerInterval({
        slotStart,
        intervalDuration,
      })
      .accounts({
        owner: withdrawOwnerIntervalPDA,
        withdrawOwnerInterval: withdrawOwnerIntervalPDA,
      })
      .rpc();
  } catch (error) {
    const message = error.message.split(".")[0];

    assert(
      message === "Signature verification failed",
      `Expected error with code 'Signature verification failed' but got '${message}'`
    );
    return;
  }
  assert(false, "Expected to error out with 'Signature verification failed'");
};

export const setWithdrawOwnerIntervalFailsInvalidStartSlot = async ({
  program,
  wallet,
  withdrawOwnerIntervalPDA,
}) => {
  try {
    const slotStart = new anchor.BN(1);
    const intervalDuration = new anchor.BN("5");

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
  } catch (error) {
    const code = error.error.errorCode.code;
    assert(
      code === "InvalidStartSlot",
      `Expected error with code 'InvalidStartSlot' but got '${code}'`
    );
    return;
  }
  assert(false, "Expected to error out with InvalidStartSlot");
};

export const setWithdrawOwnerIntervalFailsInvalidDuration = async ({
  provider,
  program,
  wallet,
  withdrawOwnerIntervalPDA,
}) => {
  try {
    const currentSlot = await provider.connection.getSlot();
    const slotStart = new anchor.BN(currentSlot + 15);
    const intervalDuration = new anchor.BN("0");

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
  } catch (error) {
    const code = error.error.errorCode.code;
    assert(
      code === "InvalidDuration",
      `Expected error with code 'InvalidDuration' but got '${code}'`
    );
    return;
  }
  assert(false, "Expected to error out with InvalidDuration");
};

export const withdrawOwnerWithSetInterval = async ({
  program,
  wallet,
  withdrawOwnerIntervalPDA,
  treasuryPDA,
  provider,
}) => {
  try {
    const withdrawOwnerIntervalInfo =
      await program.provider.connection.getAccountInfo(
        withdrawOwnerIntervalPDA
      );

    const data = withdrawOwnerIntervalInfo.data;
    const slotStart = data.readBigInt64LE(8);
    const intervalDuration = data.readBigInt64LE(16);

    console.log("Slot Start:", slotStart.toString());
    console.log(`Interval Duration: ${intervalDuration.toString()} slots`);

    const amount = new anchor.BN("1000000000");

    const listener = program.addEventListener(
      "WithdrawOwnerEvent",
      (event, _context) => {
        assert.equal(
          event.to.toString(),
          wallet.publicKey.toString(),
          "'to' address doesn't match expected address"
        );
        assert.equal(
          event.amount.toString(),
          amount.toString(),
          "Amount doesn't match expected amount"
        );
        program.removeEventListener(listener);
      }
    );

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
        const code = error.error.errorCode.code;
        console.error(`Failed at slot ${currentSlot} with error code ${code}`);
        const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        await sleep(1000);
      }
    }
  } catch (error) {
    assert(false, `Error out with ${error.message}`);
  }
};

export const withdrawOwnerFailsNoSetInterval = async ({
  program,
  wallet,
  withdrawOwnerIntervalPDA,
  treasuryPDA,
}) => {
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
  } catch (error) {
    const code = error.error.errorCode.code;

    assert(
      code === "AccountNotInitialized",
      `Expected error with code 'AccountNotInitialized' but got '${code}'`
    );
    return;
  }
  assert(false, "Expected to error out with AccountNotInitialized");
};

export const withdrawOwnerFailsCallerNotOwner = async ({
  program,
  wallet,
  withdrawOwnerIntervalPDA,
  treasuryPDA,
}) => {
  try {
    await program.methods
      .withdrawOwner(new anchor.BN("1000000000"))
      .accounts({
        owner: treasuryPDA,
        receiver: wallet.publicKey,
        withdrawOwnerInterval: withdrawOwnerIntervalPDA,
        treasury: treasuryPDA,
      })
      .rpc();
  } catch (error) {
    const message = error.message.split(".")[0];

    assert(
      message === "Signature verification failed",
      `Expected error with code 'Signature verification failed' but got '${message}'`
    );
    return;
  }
  assert(false, "Expected to error out with 'Signature verification failed'");
};

export const withdrawOwnerFailsExpiredInterval = async ({
  program,
  wallet,
  withdrawOwnerIntervalPDA,
  treasuryPDA,
}) => {
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  await sleep(5000);
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
  } catch (error) {
    const code = error.error.errorCode.code;

    assert(
      code === "InvalidSlotInterval",
      `Expected error with code 'InvalidSlotInterval' but got '${code}'`
    );
    return;
  }
  assert(false, "Expected to error out with InvalidSlotInterval");
};
