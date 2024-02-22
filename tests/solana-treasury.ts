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
    // // PDA for the Treasury Vault
    // const [treasuryPDA] = PublicKey.findProgramAddressSync(
    //   [Buffer.from("treasury")],
    //   program.programId
    // )
    // // 1 SOL
    // const fundAmount = new anchor.BN(1 * LAMPORTS_PER_SOL)
    // let accountInfo = await program.provider.connection.getAccountInfo(
    //   treasuryPDA
    // )
    // // 8nZLXraZUARNmU3P8PKbJMS7NYs7aEyw6d1aQx1km3t2
    // console.log('wallet.publicKey', wallet.publicKey.toString());
     
    // console.log('pda BEFORE', accountInfo?.lamports);
    // console.log('pda address', treasuryPDA.toString());
    // console.log('wallet BEFORE', await connection.getBalance(wallet.publicKey));

    // await program.methods
    //   .deposit(fundAmount)
    //   .accounts({
    //     payer: wallet.publicKey,
    //     treasury: treasuryPDA,
    //   })
    //   .rpc()

    // // Check rent vault balance
    // accountInfo = await program.provider.connection.getAccountInfo(
    //   treasuryPDA
    // )
    // console.log('pda AFTER', accountInfo.lamports);
    // console.log('wallet AFTER', await connection.getBalance(wallet.publicKey));
    
    // assert(accountInfo.lamports === fundAmount.toNumber())

    // const newAccount = new Keypair()
    // console.log('newAccount BEFORE', await connection.getBalance(newAccount.publicKey));

    // const withdrawAmount = new anchor.BN(LAMPORTS_PER_SOL)
    // await program.methods
    //   .withdraw(withdrawAmount)
    //   .accounts({
    //     receiver: newAccount.publicKey,
    //     treasury: treasuryPDA,
    //   })
    //   .rpc()

    // console.log('newAccount AFTER', await connection.getBalance(newAccount.publicKey));
    // accountInfo = await program.provider.connection.getAccountInfo(
    //   treasuryPDA
    // )
    // console.log('pda AFTER', accountInfo.lamports);
  })
  // eth_address: String, amount: u64, msg: Vec<u8>, signature: [u8; 64], recovery_id: u8
  it("Verifies eth signature", async () => {
    const msg_keccak = '69ee7a3423fa9be01fa80a47dffc9c3135fdccaab0ca5d5c4fbc3459b66c271e'
    let full_sig = '5bf05d6ede6316f675a3d0ad0896db0473aaa6084a1c373046fc5ea2a285edd81b0dfc8c5bb6bb0affff58fbc4c16f73b757414b0af05ab4bc139864903bb81b'
    const eth_pubkey = "026f0a0eac8db33cebd88516ccbfafc148cd97abfe217e456c4f47f0478b1b443d"
    const eth_address: string = '0xb12B5e756A894775FC32EDdf3314Bb1B1944dC34'
    // const address = ethers.getAddress(eth_address)
    const amount = "10000000000000000000"
    // let msg_digest = ethers.toBeArray(
    //     ethers.solidityPackedKeccak256(
    //         ['string'],
    //         ['result_hex']
    //     )
    // );
    let msg_digest = ethers.solidityPackedKeccak256(
        ['string'],
        ["{\"address\":\"0xb12B5e756A894775FC32EDdf3314Bb1B1944dC34\",\"amount\":10000000000000000000}"]
    )
    console.log('msg_digest', msg_digest);
    
    // let actual_message = Buffer.concat([
    //     Buffer.from('\x19Ethereum Signed Message:\n32', 'hex'),
    //     ethers.toBeArray(msg_digest),
    // ]);

    // const jsonString = '{"address":"0xb12B5e756A894775FC32EDdf3314Bb1B1944dC34","amount":10000000000000000000}';
    // const result_hex = await keccakEncodeJson(jsonString)
    
// // {"address":"0xb12B5e756A894775FC32EDdf3314Bb1B1944dC34","amount":10000000000000000000}",
//     // let full_sig_bn = ethers.toBigInt(full_sig);
    // let full_sig_bytes = ethers.toBeArray(full_sig);
    // const signature = full_sig_bytes.slice(0, 64);
    // let recoveryId = full_sig_bytes[64] - 27;

    // const eth_signer = ethers.Wallet.createRandom();

    // const my_sig = await createSignature(msg_digest)
    const eth_signer = ethers.Wallet.fromPhrase('drink sauce welcome chunk easily fiscal design shoulder welcome undo oak other');
    const my_sig: string = await createSignature()
    const full_sig_bytes = ethers.toBeArray(my_sig);
    const signature_my = full_sig_bytes.slice(0, 64);
    const recoveryId = full_sig_bytes[64] - 27;
    const signature_my_string = Buffer.from(signature_my).toString('hex');
    console.log('signature_my_string', signature_my_string);


    // console.log('full_sig_bytes', full_sig_bytes);
    // console.log('signature_my', signature_my);
    // console.log('full_sig_bytes[64]', full_sig_bytes[64]);
      
    console.log('recoveryId', recoveryId);
    console.log('eth_signer.publicKey', eth_signer.publicKey);
    
    const sigData = fromRpcSig('0x'+full_sig)
    console.log('sigData', sigData);
    console.log('sigData.r', Buffer.from(sigData.r).toString('hex'));
    console.log('sigData.rs', Buffer.concat([sigData.r, sigData.s]).toString('hex'));
    // let addrr= ethers.getAddress('0x58a8a3bd63db626497e1b4c09fb3119257c2bd0c651084eac0c038ad49bec874e380efbb5f8232aceae2383b9a1bbc22e936121ebaf83ff880801232327380e3')
    // console.log('addrr', addrr);
    // console.log('my_sig', my_sig);
    // const pubkey_arr = ethers.toBeArray(eth_signer.publicKey)
    // console.log('pubkey_arr', pubkey_arr.slice(0, 32))
    
    await program.methods.recover()
    .accounts({})
    .rpc()

    async function createSignature(): Promise<string> {
        let msg_digest = ethers.solidityPackedKeccak256(
          ['string'],
          ["{\"address\":\"0xb12B5e756A894775FC32EDdf3314Bb1B1944dC34\",\"amount\":10000000000000000000}"]
        )
        console.log('message_digest', msg_digest);
        
        // get hash as Uint8Array of size 32
        const messageHashBytes: Uint8Array = ethers.toBeArray(msg_digest);
        // Signed message that is actually this:
        // sign(keccak256("\x19Ethereum Signed Message:\n" + len(messageHash) + messageHash)))
        const signature = await eth_signer.signMessage(messageHashBytes);
        return signature;
    }

    async function keccakEncodeJson(jsonString) {
      // Parse the JSON string
      const data = JSON.parse(jsonString);
      // Convert address to lowercase
      data.address = data.address.toLowerCase();
      console.log('data.amount', data.amount);
      
      // Encode address and amount as hex strings
      const encodedAddress = ethers.hexlify(data.address);
      const encodedAmount = ethers.hexlify(data.amount.toString());
    
      // Pack data for keccak256
      const packedData = ethers.solidityPacked(['string', 'uint256'], [encodedAddress, encodedAmount]);
      // const data = `{"address":"0xb12B5e756A894775FC32EDdf3314Bb1B1944dC34","amount":10000000000000000000}`
    
      // Calculate keccak256 hash
      const keccakHash = ethers.keccak256(packedData);
      console.log('keccakHash', keccakHash);
    
      return keccakHash;
    }
  })
})