import * as anchor from "@coral-xyz/anchor";
import { assert } from "chai";
import { SolanaTreasury } from "../../target/types/solana_treasury";

interface DepositProps {
  connection: anchor.web3.Connection;
  program: anchor.Program<SolanaTreasury>;
  wallet: anchor.Wallet;
  treasuryPDA: anchor.web3.PublicKey;
}

export const deposit = async ({
  connection,
  program,
  wallet,
  treasuryPDA,
}: DepositProps) => {
  const data = {
    addressIcp:
      "pvmak-bbryo-hipdn-slp5u-fpsh5-tkf7f-v2wss-534um-jc454-ommhu-2qe",
    amount: "50000000000",
  };
  const walletBalanceInitial = await connection.getBalance(wallet.publicKey);

  // Add listener for DepositEvent and check event details
  const listener = program.addEventListener(
    "DepositEvent",
    (event, _context) => {
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

  let pdaAccountInfo = await program.provider.connection.getAccountInfo(
    treasuryPDA
  );
  let walletBalance = await connection.getBalance(wallet.publicKey);
  const walletBalanceAfter = walletBalanceInitial - parseInt(data.amount) - fee;

  // Assert values with informative messages
  assert(
    pdaAccountInfo.lamports === parseInt(data.amount),
    `Treasury PDA doesn't contain deposited amount (${parseInt(data.amount)})`
  );
  assert(
    walletBalance === walletBalanceAfter,
    `Wallet balance doesn't reflect expected deduction (${walletBalanceAfter})`
  );
};
