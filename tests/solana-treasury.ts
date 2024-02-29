import * as anchor from "@coral-xyz/anchor"
import { SolanaTreasury } from "../target/types/solana_treasury"
import { LAMPORTS_PER_SOL, PublicKey, Keypair } from "@solana/web3.js"
import { assert } from "chai"
import { ethers } from 'ethers';
import {fromRpcSig} from "ethereumjs-util"

describe("Treasury", () => {
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)
  const wallet = provider.wallet as anchor.Wallet
  const connection = provider.connection

  const idl = JSON.parse(
    require("fs").readFileSync("./target/idl/solana_treasury.json", "utf8")
  );
  const programId = new anchor.web3.PublicKey("3PxEqHbGAWZthkyuJvtTjjwYSQ3HRGJVyk8MbjnZP2mt");
  const program = new anchor.Program(idl, programId) as anchor.Program<SolanaTreasury>;

  // PDA for the Treasury Vault
  const [treasuryPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("treasury")],
    program.programId
  )

  it("Deposit SOL and check event", async () => {
    const data = {
      icpAddress: '28247eeec42d05229af347b17cf02e30bf67452cff5ae7b60718d12878043642',
      amount: new anchor.BN(100 * LAMPORTS_PER_SOL)
    }
    const walletBalanceInitial = await connection.getBalance(wallet.publicKey)

    const listener = program.addEventListener('DepositEvent', (event, context) => {
      assert.equal(event.sender, data.icpAddress);
      assert.equal(event.amount.toString(), data.amount.toString());
      program.removeEventListener(listener);
    });

    await program.methods
      .deposit({
        addressIcp: data.icpAddress,
        amount: data.amount
      })
      .accounts({
        payer: wallet.publicKey,
        treasury: treasuryPDA,
      })
      .rpc()

    let pdaAccountInfo = await getTreasuryPDA()
    let walletBalance = await connection.getBalance(wallet.publicKey)
    const txFee = 4992;

    assert(pdaAccountInfo.lamports === data.amount.toNumber())
    assert(walletBalance === walletBalanceInitial - data.amount.toNumber() - txFee)
  })

  it('Withdraw SOL with valid signature and data', async () => {
    const newWallet = new Keypair()

    const data = {
      address: '0xb12B5e756A894775FC32EDdf3314Bb1B1944dC34',
      amount: '10000000000000000000'
    }
    const dataHash = "0x" + "e0df3dc574a459b73bbf1e885cf89e10e5692a1dff8c7270c35d7aad9a439a71"
    const sig = '0x' + '0caad715a17ef7c9ba6966eb200325bfdaa5a6f1bca9685c7f298f08366544f65e1a907524b941f66f9f064832c96eabb6a188e12cc6a151e82da2f7131eaaaa'

    const pdaLamportsInitial = (await getTreasuryPDA()).lamports

    await program.methods
      .withdraw({
        message: Buffer.from(ethers.toBeArray(dataHash)),
        signature: Buffer.from(ethers.toBeArray(sig)).toJSON().data,
        verifyData: {
          address: data.address,
          amount: new anchor.BN(data.amount)
        }                        
      })
      .accounts({
        receiver: newWallet.publicKey,
        treasury: treasuryPDA,
      })
      .rpc()

    const pdaAccountInfo = await getTreasuryPDA()
    const demoninatorTestPerposes = 1000000000
    const newWalletBalance = await connection.getBalance(newWallet.publicKey)
    const amount = parseInt(data.amount) / demoninatorTestPerposes

    assert(pdaAccountInfo.lamports === pdaLamportsInitial - amount)
    assert(newWalletBalance === amount)
  })

  it('Fail to withdraw SOL with not valid data', async () => {
    const newWallet = new Keypair()

    const data = {
      address: '0xb12B5e756A894775FC32EDdf3314Bb1B1944dC34',
      amount: '200000000000000000'
    }
    const dataHash = "0x" + "e0df3dc574a459b73bbf1e885cf89e10e5692a1dff8c7270c35d7aad9a439a71"
    const sig = '0x' + '0caad715a17ef7c9ba6966eb200325bfdaa5a6f1bca9685c7f298f08366544f65e1a907524b941f66f9f064832c96eabb6a188e12cc6a151e82da2f7131eaaaa'

    let expectedError;
    try {
      await program.methods
        .withdraw({
          message: Buffer.from(ethers.toBeArray(dataHash)),
          signature: Buffer.from(ethers.toBeArray(sig)).toJSON().data,
          verifyData: {
            address: data.address,
            amount: new anchor.BN(data.amount), // Keep the invalid amount for the test
          },
        })
        .accounts({
          receiver: newWallet.publicKey,
          treasury: treasuryPDA,
        })
        .rpc();
    } catch (error) {
      assert(error.error.errorCode.code === 'InvalidDataHash')
      expectedError = error 
    }
    
    if (!expectedError) {
      assert(false, 'Should have errored out')
    }
  })

  it('Fails to withdraw SOL with not valid signature', async () => {
    const newWallet = new Keypair()

    const data = {
      address: '0xb12B5e756A894775FC32EDdf3314Bb1B1944dC34',
      amount: '10000000000000000000'
    }
    const dataHash = "0x" + "e0df3dc574a459b73bbf1e885cf89e10e5692a1dff8c7270c35d7aad9a439a71"
    const sig = '0x' + '0cabd715a17ef7c9ba6966eb200325bfdaa5a6f1bca9685c7f298f08366544f65e1a907524b941f66f9f064832c96eabb6a188e12cc6a151e82da2f7131eaaaa'

    let expectedError;
    try {
      await program.methods
        .withdraw({
          message: Buffer.from(ethers.toBeArray(dataHash)),
          signature: Buffer.from(ethers.toBeArray(sig)).toJSON().data,
          verifyData: {
            address: data.address,
            amount: new anchor.BN(data.amount), // Keep the invalid amount for the test
          },
        })
        .accounts({
          receiver: newWallet.publicKey,
          treasury: treasuryPDA,
        })
        .rpc();
    } catch (error) {
      assert(error.error.errorCode.code === 'InvalidSignature')
      expectedError = error 
    }
    
    if (!expectedError) {
      assert(false, 'Should have errored out')
    }
  })

  it('Fails to withdraw SOL with not valid data hash', async () => {
    const newWallet = new Keypair()

    const data = {
      address: '0xb12B5e756A894775FC32EDdf3314Bb1B1944dC34',
      amount: '10000000000000000000'
    }
    const dataHash = "0x" + "e1df3dc574a459b73bbf1e885cf89e10e5692a1dff8c7270c35d7aad9a439a71"
    const sig = '0x' + '0cabd715a17ef7c9ba6966eb200325bfdaa5a6f1bca9685c7f298f08366544f65e1a907524b941f66f9f064832c96eabb6a188e12cc6a151e82da2f7131eaaaa'

    let expectedError;
    try {
      await program.methods
        .withdraw({
          message: Buffer.from(ethers.toBeArray(dataHash)),
          signature: Buffer.from(ethers.toBeArray(sig)).toJSON().data,
          verifyData: {
            address: data.address,
            amount: new anchor.BN(data.amount), // Keep the invalid amount for the test
          },
        })
        .accounts({
          receiver: newWallet.publicKey,
          treasury: treasuryPDA,
        })
        .rpc();
    } catch (error) {
      assert(error.error.errorCode.code === 'InvalidDataHash')
      expectedError = error 
    }
    
    if (!expectedError) {
      assert(false, 'Should have errored out')
    }
  })

  const getTreasuryPDA = async () => {
    return program.provider.connection.getAccountInfo(treasuryPDA)
  }
 
  // test valid signature
  // "0caad715a17ef7c9ba6966eb200325bfdaa5a6f1bca9685c7f298f08366544f65e1a907524b941f66f9f064832c96eabb6a188e12cc6a151e82da2f7131eaaaa"
  // "ae85e96ae498a31da39e97fae432cbf07879f0e5b4f613681cb780adcb9e620956bb466d644cccfb6cee248a5ac7018f4ceee7ba0bfb7f2ed5b41efe8130a7c8"
  // "f01a5557a253b182075da3738e81d86c7c750c86e7f2f4460cf0c7ecf8aa325c0a03d1d7bd2e7e8a12a944f69f2a27d73812243c7a3d8c49297343250528220a"
  // "d637ff1e0bc28b2ed79e90a3581a4216f1c020a8774f7ec95a17d201c72876f658beabb5f8d37cf3cd8d94c2f398cc46e2acdb9aeb89e3fa547680c78c75dade"
  // "9bfd10f99e69dea0704d6dbf81900fe9b244673f99f2d6ae82b0b81a220d6a7b5eebdbd45647d6b197a31fcfe3e26d048e3b13f634403e14a849ba7ce254db3a"
  // "ad8769c0761345d9d0fb6912385dadf4f8b32e2b528393be7a0df33a0e283f2d1a2131280817e66d7186ad39c5d203fc6df4c0ec4dab053e69c6ec402c5b4ace"
  // "5bf1ad0667111758cb9eef5b89e6eeb82679c1ce8637c1f70b0e7b8dee104ee21a0a8d4bf539c691131eb035498425679c1cc3075564cc316c52c1fb55823e2b"
  // "0990e52790b756f44e69fccde3f253a891692bee11e3b169926bdaa09fdcfa775b4e5f5fbcd6f516279012021fcd9b7efe0252a9ea6e09d9d43ce21465aca9b8"
  // "b7a32ceafab4023293fb8f824d780bdcbdf022d0728b19ce797e2b7a8132acb55d7bb594b9314d31b96d871927b71b4b79d1ac09ad7642928d288e82f710bd25"
})