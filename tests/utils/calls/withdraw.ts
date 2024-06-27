// const {
//   Connection,
//   PublicKey,
//   Keypair,
//   Transaction,
//   sendAndConfirmTransaction,
// } = require("@solana/web3.js");
// const anchor1 = require("@project-serum/anchor");
// const idlProgram = require("../target/idl/solana_treasury.json");
// const fs = require("fs");
// const os = require("os");
// const crypto1 = require("crypto");
// const ethers = require("ethers");

// const connection = new Connection(
//   "https://api.mainnet-beta.solana.com",
//   "confirmed"
// );
// // const connection = new Connection(
// //   "https://solana-mainnet.g.alchemy.com/v2/3OI2ioHFh0poFMYQbyKhtkX9j3e4G0Ek",
// //   "confirmed"
// // );
// // const connection = new Connection("https://api.devnet.solana.com", "confirmed");
// // const connection = new Connection("http://127.0.0.1:8899", "confirmed");

// const homeDirectory = os.homedir();
// const idFilePath = `${homeDirectory}/.config/solana/id.json`;

// const secretKeyString = fs.readFileSync(idFilePath, "utf8");
// const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
// const wallet = Keypair.fromSecretKey(secretKey);

// const programId = new PublicKey("AAJL4DeXnWBNRowWjvpkAgwtAACpz6NfaA1T2p8Hrpy");

// const idl = idlProgram;
// const provider = new anchor1.AnchorProvider(
//   connection,
//   wallet,
//   anchor1.AnchorProvider.defaultOptions()
// );
// const program = new anchor1.Program(idl, programId, provider);

// const [treasuryPDA] = PublicKey.findProgramAddressSync(
//   [Buffer.from("treasury")],
//   program.programId
// );

// const coupon = {
//   from_icp_address:
//     "pvmak-bbryo-hipdn-slp5u-fpsh5-tkf7f-v2wss-534um-jc454-ommhu-2qe",
//   to_sol_address: "8nZLXraZUARNmU3P8PKbJMS7NYs7aEyw6d1aQx1km3t2",
//   amount: "10_000_000",
//   burn_id: 0,
//   burn_timestamp: "1716994668977025165",
//   icp_burn_block_index: 2,
// };

// const couponHash =
//   "0x" + "153e935d5ba866812c6ae00095c9f765df08aee57df63dc638d2e888bd92cf4a";
// const sig =
//   "0x" +
//   "02f0d597f3bbaf02efb1d42ebd3e725317d99c94cc1315fadf2195471f90ee6a69dc667a11188e67e3a126048a2f1454e102f23fba83e2ea04ee439ebc88ed5a";
// const recoveryId = 0;

// const sigHashed = crypto1
//   .createHash("sha256")
//   .update(ethers.toBeArray(sig))
//   .digest();

// const sigHashedBytes = sigHashed.toJSON().data;
// const hashedSignaturePubkey = new PublicKey(sigHashedBytes);
// const [signaturePda] = PublicKey.findProgramAddressSync(
//   [hashedSignaturePubkey.toBuffer()],
//   program.programId
// );
// const receiverPubkey = new PublicKey(coupon.to_sol_address);

// program.methods
//   .withdraw({
//     message: Buffer.from(ethers.toBeArray(couponHash)),
//     signature: Buffer.from(ethers.toBeArray(sig)).toJSON().data,
//     coupon: {
//       fromIcpAddress: coupon.from_icp_address,
//       toSolAddress: coupon.to_sol_address,
//       amount: coupon.amount,
//       burnId: new anchor1.BN(coupon.burn_id),
//       burnTimestamp: coupon.burn_timestamp,
//       icpBurnBlockIndex: new anchor1.BN(coupon.icp_burn_block_index),
//     },
//     recoveryId,
//   })
//   .accounts({
//     payer: wallet.publicKey,
//     receiver: receiverPubkey,
//     treasury: treasuryPDA,
//     hashedSignaturePubkey: hashedSignaturePubkey,
//     signaturePda: signaturePda,
//   })
//   .transaction()
//   .then(async (tx) => {
//     let transaction = new Transaction().add(tx);
//     try {
//       const signature = await sendAndConfirmTransaction(
//         connection,
//         transaction,
//         [wallet]
//       );
//       console.log("signature", signature);
//       const transactionDetails = await connection.getTransaction(signature);
//       console.log(transactionDetails);
//     } catch (e) {
//       console.log("e", e);
//     }
//   });
