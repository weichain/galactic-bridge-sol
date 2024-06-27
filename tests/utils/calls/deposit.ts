const {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  sendAndConfirmTransaction,
} = require("@solana/web3.js");
const anchor1 = require("@project-serum/anchor");
const idlProgram = require("../target/idl/solana_treasury.json");
const fs = require("fs");
const os = require("os");

const connection = new Connection(
  "http://api.mainnet-beta.solana.com",
  "confirmed"
);
// const connection = new Connection(
//   "https://solana-mainnet.g.alchemy.com/v2/rfd7aBfJ50gu7A_wesmRYaaecHOq57iS",
//   "confirmed"
// );
// const connection = new Connection(
//   "https://solana-mainnet.g.alchemy.com/v2/3OI2ioHFh0poFMYQbyKhtkX9j3e4G0Ek",
//   "confirmed"
// );
// const connection = new Connection("https://api.devnet.solana.com", "confirmed");
// const connection = new Connection("http://127.0.0.1:8899", "confirmed");

const homeDirectory = os.homedir();
const idFilePath = `${homeDirectory}/.config/solana/id.json`;

const secretKeyString = fs.readFileSync(idFilePath, "utf8");
const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
const wallet = Keypair.fromSecretKey(secretKey);

const programId = new PublicKey("AAJL4DeXnWBNRowWjvpkAgwtAACpz6NfaA1T2p8Hrpy");

// const additionalFee = 1200000; // Example: 1000 microLamports
// anchor1.web3.ComputeBudgetProgram.setComputeUnitPrice({
//   microLamports: additionalFee,
// });
// console.log("ancohr1", anchor1);

const [treasuryPDA] = PublicKey.findProgramAddressSync(
  [Buffer.from("treasury")],
  programId
);

const data = {
  addressIcp: "pvmak-bbryo-hipdn-slp5u-fpsh5-tkf7f-v2wss-534um-jc454-ommhu-2qe",
  amount: "100000000",
};

const idl = idlProgram;
const provider = new anchor1.AnchorProvider(
  connection,
  wallet,
  anchor1.AnchorProvider.defaultOptions()
);
const program = new anchor1.Program(idl, programId, provider);

program.methods
  .deposit({
    addressIcp: data.addressIcp,
    amount: new anchor1.BN(data.amount),
  })
  .accounts({
    payer: wallet.publicKey,
    treasury: treasuryPDA,
  })
  .transaction()
  .then(async (tx) => {
    let transaction = new Transaction().add(tx);
    try {
      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [wallet]
      );
      console.log("signature", signature);
      const transactionDetails = await connection.getTransaction(signature);
      console.log(transactionDetails);
    } catch (e) {
      console.log("e", e);
    }
  });
