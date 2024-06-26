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

// // const connection = new Connection(
// //   "https://api.mainnet-beta.solana.com",
// //   "confirmed"
// // );
// // const connection = new Connection("https://api.devnet.solana.com", "confirmed");
// const connection = new Connection("http://127.0.0.1:8899", "confirmed");

// const homeDirectory = os.homedir();
// const idFilePath = `${homeDirectory}/.config/solana/id.json`;

// const secretKeyString = fs.readFileSync(idFilePath, "utf8");
// const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
// const wallet = Keypair.fromSecretKey(secretKey);
// const receiver = new PublicKey("3fBAA3cDnrdLnjK6wmCD6W9qbtZkiyuFHGKQsLGoovK6");

// const programId = new PublicKey("AAJL4DeXnWBNRowWjvpkAgwtAACpz6NfaA1T2p8Hrpy");

// const [treasuryPDA] = PublicKey.findProgramAddressSync(
//   [Buffer.from("treasury")],
//   programId
// );

// const idl = idlProgram;
// const provider = new anchor1.AnchorProvider(
//   connection,
//   wallet,
//   anchor1.AnchorProvider.defaultOptions()
// );
// const program = new anchor1.Program(idl, programId, provider);

// program.methods
//   .withdrawOwner(new anchor1.BN("17935000009"))
//   .accounts({
//     owner: wallet.publicKey,
//     receiver: receiver,
//     treasury: treasuryPDA,
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
//       console.log("transactionDetails", transactionDetails);
//     } catch (e) {
//       console.log("e", e);
//     }
//   });
