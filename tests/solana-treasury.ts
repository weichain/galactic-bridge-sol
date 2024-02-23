import * as anchor from "@coral-xyz/anchor"
import { SolanaTreasury } from "../target/types/solana_treasury"
import { LAMPORTS_PER_SOL, PublicKey, Keypair } from "@solana/web3.js"
import { assert } from "chai"
import { ethers } from 'ethers';
import {fromRpcSig} from "ethereumjs-util"

describe("PDA Rent-Payer", () => {
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)
  const wallet = provider.wallet as anchor.Wallet
  const connection = provider.connection
  // Read the generated IDL.
  const idl = JSON.parse(
    require("fs").readFileSync("./target/idl/solana_treasury.json", "utf8")
  );

  //Address of the deployed program
  const programId = new anchor.web3.PublicKey("3PxEqHbGAWZthkyuJvtTjjwYSQ3HRGJVyk8MbjnZP2mt");

  //Generate the program client from IDL
  const program = new anchor.Program(idl, programId) as anchor.Program<SolanaTreasury>;
  // const program = anchor.workspace.SolanaTreasury as anchor.Program<SolanaTreasury>

  it("Send SOL to contract", async () => {
    // PDA for the Treasury Vault
    const [treasuryPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("treasury")],
      program.programId
    )
    // 1 SOL
    const fundAmount = new anchor.BN(2 * LAMPORTS_PER_SOL)
    let accountInfo = await program.provider.connection.getAccountInfo(
      treasuryPDA
    )
    // 8nZLXraZUARNmU3P8PKbJMS7NYs7aEyw6d1aQx1km3t2
    console.log('wallet.publicKey', wallet.publicKey.toString());
     
    console.log('pda BEFORE', accountInfo?.lamports);
    console.log('pda address', treasuryPDA.toString());
    console.log('wallet BEFORE', await connection.getBalance(wallet.publicKey));

    await program.methods
      .deposit(fundAmount)
      .accounts({
        payer: wallet.publicKey,
        treasury: treasuryPDA,
      })
      .rpc()

    // Check rent vault balance
    accountInfo = await program.provider.connection.getAccountInfo(
      treasuryPDA
    )
    console.log('pda AFTER', accountInfo.lamports);
    console.log('wallet AFTER', await connection.getBalance(wallet.publicKey));
    
    assert(accountInfo.lamports === fundAmount.toNumber())

    const newAccount = new Keypair()
    console.log('newAccount BEFORE', await connection.getBalance(newAccount.publicKey));

    const withdrawAmount = new anchor.BN(LAMPORTS_PER_SOL)
    await program.methods
      .withdraw(withdrawAmount)
      .accounts({
        receiver: newAccount.publicKey,
        treasury: treasuryPDA,
      })
      .rpc()

    console.log('newAccount AFTER', await connection.getBalance(newAccount.publicKey));
    accountInfo = await program.provider.connection.getAccountInfo(
      treasuryPDA
    )
    console.log('pda AFTER', accountInfo.lamports);
  })
  it("Verifies eth signature", async () => {
    // const secp_pubkey = '0x' + '67c358de3b815816756d6f2cb0520ca22b660b282de8e599de83a2b4bb2f60ab917bbdfe514ee0fc1db49d35cee136c706f2eed95f75aa4447b96cceb5bcac57'
    // const secp_pubkey_bytes = ethers.toBeArray(secp_pubkey);
    const data_hash = "0x" + "e0df3dc574a459b73bbf1e885cf89e10e5692a1dff8c7270c35d7aad9a439a71"
    const my_sig: string = '0x' + '0caad715a17ef7c9ba6966eb200325bfdaa5a6f1bca9685c7f298f08366544f65e1a907524b941f66f9f064832c96eabb6a188e12cc6a151e82da2f7131eaaaa'
    
    const data_hash_bytes = ethers.toBeArray(data_hash);
    const signature_my = ethers.toBeArray(my_sig);

    // {"address":"0xb12B5e756A894775FC32EDdf3314Bb1B1944dC34","amount":10000000000000000000}"}
    await program.methods.verify({
      message: Buffer.from(data_hash_bytes),
      signature: Buffer.from(signature_my).toJSON().data,
      verifyData: {
        address: "0xb12B5e756A894775FC32EDdf3314Bb1B1944dC34",
        amount: new anchor.BN('10000000000000000000')
      }
    })
    .accounts({})
    .rpc()
  })
})