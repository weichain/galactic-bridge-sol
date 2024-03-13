import * as anchor from "@coral-xyz/anchor"
import { SolanaTreasury } from "../target/types/solana_treasury"
import { LAMPORTS_PER_SOL, PublicKey, Keypair } from "@solana/web3.js"
import { assert } from "chai"
import { ethers } from 'ethers';
import {fromRpcSig} from "ethereumjs-util"
import * as crypto from 'crypto';

describe("Treasury", () => {
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)
  const wallet = provider.wallet as anchor.Wallet
  const connection = provider.connection

  const idl = JSON.parse(
    require("fs").readFileSync("./target/idl/solana_treasury.json", "utf8")
  );
  const programId = new anchor.web3.PublicKey("HS6NTv6GBVSLct8dsimRWRvjczJTAgfgDJt8VpR8wtGm");
  const program = new anchor.Program(idl, programId) as anchor.Program<SolanaTreasury>;
  
  // PDA for the Treasury Vault
  const [treasuryPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("treasury")],
    program.programId
  )

  it("Deposit SOL and check event", async () => {
    const data = {
      addressIcp: '28247eeec42d05229af347b17cf02e30bf67452cff5ae7b60718d12878043642',
      amount: '10000000000'
    };
  
    const walletBalanceInitial = await connection.getBalance(wallet.publicKey);
  
    // Add listener for DepositEvent and check event details
    // const listener = program.addEventListener('DepositEvent', (event, context) => {
    //   assert.equal(event.addressIcp, data.addressIcp, "Deposited ICP address doesn't match expected address");
    //   assert.equal(event.amount, data.amount, "Deposited amount doesn't match expected amount");
    //   program.removeEventListener(listener);
    // });
    
    // for (let index = 0; index < 10; index++) {
      await program.methods
        .deposit({
          addressIcp: data.addressIcp,
          amount: new anchor.BN(data.amount)
        })
        .accounts({
          payer: wallet.publicKey,
          treasury: treasuryPDA,
        })
        .rpc();
      
    // }

    let pdaAccountInfo = await getTreasuryPDA();
    let walletBalance = await connection.getBalance(wallet.publicKey);
    const txFee = 5000;
    const walletBalanceAfter = walletBalanceInitial - parseInt(data.amount) - txFee

    // Assert values with informative messages
    // assert(pdaAccountInfo.lamports === parseInt(data.amount), `Treasury PDA doesn't contain deposited amount (${parseInt(data.amount)})`);
    // assert(walletBalance === walletBalanceAfter, `Wallet balance doesn't reflect expected deduction (${walletBalanceAfter})`);

  });

  // "{"address":"9gVndQ5SdugdFfGzyuKmePLRJZkCreKZ2iUTEg4agR5g","amount":10000000}",
  it('Withdraw SOL with valid signature and data', async () => {
    const data = {
      address: '9gVndQ5SdugdFfGzyuKmePLRJZkCreKZ2iUTEg4agR5g',
      amount: '10000000'
    };
    const dataHash = "0x" + "04a9dd358a821b90a0523cbbb3b2ad3fbd8be75e09b132c5c129b65589774c9d";
    const sig = '0x' + '24b7b5f75624d91797593af3cc6e473f6120a4eda25a344e94f4ccf0c9155a0327d55e9cb7a740b5b197f04055cfdf9fa7525ec398b2e80c5538dd98cbb14d89';
    const pdaLamportsInitial = (await getTreasuryPDA()).lamports;
    const walletBalanceInitial = await connection.getBalance(wallet.publicKey);
  
    // da razbera kak se pravi tva 
    // let sig_hashed: Hash = hash(&data.signature);
    const hashed_sig_bytes = [202, 37, 110, 142, 185, 219, 44, 234, 141, 115, 36, 234, 181, 16, 38, 244, 230, 209, 160, 14, 215, 86, 101, 97, 56, 179, 215, 70, 95, 11, 50, 15]
    const pk  = new PublicKey(hashed_sig_bytes);
    // console.log('pk', pk.toString());
    
    const [pdaAddress] = PublicKey.findProgramAddressSync(
      [pk.toBuffer()],
      program.programId
    )

    // Call program method to withdraw SOL
    await program.methods
      .withdraw({
        message: Buffer.from(ethers.toBeArray(dataHash)),
        signature: Buffer.from(ethers.toBeArray(sig)).toJSON().data,
        verifyData: {
          address: data.address,
          amount: new anchor.BN(data.amount),
        },
      })
      .accounts({
        payer: wallet.publicKey,
        receiver: wallet.publicKey,
        treasury: treasuryPDA,
        pda: pdaAddress,
        generatedOutside: pk
      })
      .rpc();


    const pda = await connection.getAccountInfo(pdaAddress)
    // console.log('pda', pda);
    
    const pdaAccountInfo = await getTreasuryPDA();
    const walletBalance = await connection.getBalance(wallet.publicKey);
    const expectedAmount = parseInt(data.amount);
    const fee = 902848;
    
    const walletBalanceAfter = walletBalanceInitial + expectedAmount - fee;
    
    // Assert treasury PDA balance with informative message
    assert(
      pdaAccountInfo?.lamports ?? 0 === pdaLamportsInitial - expectedAmount,
      `Treasury PDA balance (${pdaAccountInfo?.lamports ?? 0}) doesn't reflect expected decrease after withdrawal (${expectedAmount})`
    );
      
    // Assert wallet balance with informative message
    assert(
      walletBalance === walletBalanceAfter,
      `Wallet balance (${walletBalance}) doesn't reflect expected increase after withdrawal (${walletBalanceAfter})`
    );
  });

  it('Fails to withdraws because of used signature', async () => {
    const data = {
      address: '9gVndQ5SdugdFfGzyuKmePLRJZkCreKZ2iUTEg4agR5g',
      amount: '10000000'
    };
    const dataHash = "0x" + "04a9dd358a821b90a0523cbbb3b2ad3fbd8be75e09b132c5c129b65589774c9d";
    const sig = '0x' + '24b7b5f75624d91797593af3cc6e473f6120a4eda25a344e94f4ccf0c9155a0327d55e9cb7a740b5b197f04055cfdf9fa7525ec398b2e80c5538dd98cbb14d89';
  
    const pdaLamportsInitial = (await getTreasuryPDA()).lamports;
    const walletBalanceInitial = await connection.getBalance(wallet.publicKey);
    // const hashed_sig = 'Ec6Tg2xPK7c8rDrKLBgnaKtxx8RzaYDdaHd5ccURL3Yi'
    const hashed_sig_bytes = [202, 37, 110, 142, 185, 219, 44, 234, 141, 115, 36, 234, 181, 16, 38, 244, 230, 209, 160, 14, 215, 86, 101, 97, 56, 179, 215, 70, 95, 11, 50, 15]
    const pk  = new PublicKey(hashed_sig_bytes);
    // console.log('pk', pk.toString());
    // console.log('sig_bytes', Buffer.from(ethers.toBeArray(hashed_sig)).toJSON().data);

    const [generatedOutside] = PublicKey.findProgramAddressSync(
      [pk.toBuffer()],
      program.programId
    )

    try {
      await program.methods
        .withdraw({
          message: Buffer.from(ethers.toBeArray(dataHash)),
          signature: Buffer.from(ethers.toBeArray(sig)).toJSON().data,
          verifyData: {
            address: data.address,
            amount: new anchor.BN(data.amount),
          },
        })
        .accounts({
          payer: wallet.publicKey,
          receiver: wallet.publicKey,
          treasury: treasuryPDA,
          pda: generatedOutside,
          generatedOutside: pk
        })
        .rpc();
    } catch (error) {
      const code = error.error.errorCode.code
          // Assert specific error code with informative message
          assert(
            code === 'SignatureUsed',
            `Expected error with code 'SignatureUsed' but got '${code}'`
          );
      return 
    }

    assert(false, 'Expected to error out with SignatureUsed')
  });


  // it('Fails to withdraw SOL with invalid data', async () => {
  //   const data = {
  //     address: '9gVndQ5SdugdFfGzyuKmePLRJZkCreKZ2iUTEg4agR5g',
  //     amount: '100000'
  //   };
  //   const dataHash = "0x" + "04a9dd358a821b90a0523cbbb3b2ad3fbd8be75e09b132c5c129b65589774c9d";
  //   const sig = '0x' + 'fff722f41eb1cae151458c2d9acf16695984d1376a6a0a6ab56a385204f889370aec600906f278c5d9522d1df16ab50940827f96d7f62f61cd2ba33b28f2b7df';
  //   const pdaLamportsInitial = (await getTreasuryPDA()).lamports;
    
  //   try {
  //     await program.methods
  //       .withdraw({
  //         message: Buffer.from(ethers.toBeArray(dataHash)),
  //         signature: Buffer.from(ethers.toBeArray(sig)).toJSON().data,
  //         verifyData: {
  //           address: data.address,
  //           amount: new anchor.BN(data.amount), // Intentionally invalid amount
  //         },
  //       })
  //       .accounts({
  //         receiver: wallet.publicKey,
  //         treasury: treasuryPDA,
  //       })
  //       .rpc();
  //     // No assertion here, as an error is expected
  //   } catch (error) {
  //     const code = error.error.errorCode.code
  //     // Assert specific error code with informative message
  //     assert(
  //       code === 'InvalidDataHash',
  //       `Expected error with code 'InvalidDataHash' but got '${code}'`
  //     );
  //     return 
  //   }
  //   assert(false, 'Expected to error out with InvalidDataHash')
  // });

  // it('Fails to withdraw SOL with invalid signature', async () => {
  //   const data = {
  //     address: '9gVndQ5SdugdFfGzyuKmePLRJZkCreKZ2iUTEg4agR5g',
  //     amount: '10000000'
  //   };
  //   const dataHash = "0x" + "04a9dd358a821b90a0523cbbb3b2ad3fbd8be75e09b132c5c129b65589774c9d";
  //   const sig = '0x' + 'f1f722f41eb1cae151458c2d9acf16695984d1376a6a0a6ab56a385204f889370aec600906f278c5d9522d1df16ab50940827f96d7f62f61cd2ba33b28f2b7df';
  
  //   try {
  //     await program.methods
  //       .withdraw({
  //         message: Buffer.from(ethers.toBeArray(dataHash)),
  //         signature: Buffer.from(ethers.toBeArray(sig)).toJSON().data,
  //         verifyData: {
  //           address: data.address,
  //           amount: new anchor.BN(data.amount),
  //         },
  //       })
  //       .accounts({
  //         receiver: wallet.publicKey,
  //         treasury: treasuryPDA,
  //       })
  //       .rpc();
  //   } catch (error) {
  //     // Assert specific error code with informative message
  //     assert(
  //       error.error.errorCode.code === 'InvalidSignature',
  //       `Expected error with code 'InvalidSignature' but got '${error.error.errorCode.code}'`
  //     );
  //     return
  //   }
  //   assert(false, 'Expected to error out with InvalidSignature')
  // });

  // it('Fails to withdraw SOL with invalid data hash', async () => {
  //   const data = {
  //     address: '9gVndQ5SdugdFfGzyuKmePLRJZkCreKZ2iUTEg4agR5g',
  //     amount: '10000000'
  //   };
  //   const dataHash = "0x" + "01a9dd358a821b90a0523cbbb3b2ad3fbd8be75e09b132c5c129b65589774c9d";
  //   const sig = '0x' + 'fff722f41eb1cae151458c2d9acf16695984d1376a6a0a6ab56a385204f889370aec600906f278c5d9522d1df16ab50940827f96d7f62f61cd2ba33b28f2b7df';
  
  //   try {
  //     await program.methods
  //       .withdraw({
  //         message: Buffer.from(ethers.toBeArray(dataHash)),
  //         signature: Buffer.from(ethers.toBeArray(sig)).toJSON().data,
  //         verifyData: {
  //           address: data.address,
  //           amount: new anchor.BN(data.amount),
  //         },
  //       })
  //       .accounts({
  //         receiver: wallet.publicKey,
  //         treasury: treasuryPDA,
  //       })
  //       .rpc();
  //   } catch (error) {
  //     // Assert specific error code with informative message
  //     assert(
  //       error.error.errorCode.code === 'InvalidDataHash',
  //       `Expected error with code 'InvalidDataHash' but got '${error.error.errorCode.code}'`
  //     );
  //     return
  //   }
  //   assert(false, 'Expected to error out with InvalidDataHash')
  // });

  const getTreasuryPDA = async () => {
    return program.provider.connection.getAccountInfo(treasuryPDA)
  }
})