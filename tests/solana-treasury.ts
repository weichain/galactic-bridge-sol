import * as anchor from "@coral-xyz/anchor"
import { SolanaTreasury } from "../target/types/solana_treasury"
import { PublicKey } from "@solana/web3.js"
import { assert } from "chai"
import { ethers } from 'ethers';
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
    const listener = program.addEventListener('DepositEvent', (event, context) => {
      assert.equal(event.addressIcp, data.addressIcp, "Deposited ICP address doesn't match expected address");
      assert.equal(event.amount.toString(), data.amount, "Deposited amount doesn't match expected amount");
      program.removeEventListener(listener);
    });
    
    const latestBlockHash = await connection.getLatestBlockhash();
    const methodBuilder = program.methods
      .deposit({
          addressIcp: data.addressIcp,
          amount: new anchor.BN(data.amount)
      })
      .accounts({
          payer: wallet.publicKey,
          treasury: treasuryPDA,
      })
    const tx = await methodBuilder.transaction();
    tx.recentBlockhash = latestBlockHash.blockhash;
    tx.feePayer = wallet.publicKey;
    const fee = await tx.getEstimatedFee(connection);

    await methodBuilder.rpc()

    let pdaAccountInfo = await getTreasuryPDA();
    let walletBalance = await connection.getBalance(wallet.publicKey);
    const walletBalanceAfter = walletBalanceInitial - parseInt(data.amount) - fee

    // Assert values with informative messages
    assert(pdaAccountInfo.lamports === parseInt(data.amount), `Treasury PDA doesn't contain deposited amount (${parseInt(data.amount)})`);
    assert(walletBalance === walletBalanceAfter, `Wallet balance doesn't reflect expected deduction (${walletBalanceAfter})`);

  });

  it('Fails to withdraw SOL due to invalid data', async () => {
    const data = {
      address: '9gVndQ5SdugdFfGzyuKmePLRJZkCreKZ2iUTEg4agR5g',
      amount: '99999999'
    };
    const dataHash = "0x" + "04a9dd358a821b90a0523cbbb3b2ad3fbd8be75e09b132c5c129b65589774c9d";
    const sig = '0x' + '24b7b5f75624d91797593af3cc6e473f6120a4eda25a344e94f4ccf0c9155a0327d55e9cb7a740b5b197f04055cfdf9fa7525ec398b2e80c5538dd98cbb14d89';
    const sigHashed = crypto.createHash('sha256').update(ethers.toBeArray(sig)).digest();
    const sigHashedBytes = sigHashed.toJSON().data
    const hashedSignaturePubkey  = new PublicKey(sigHashedBytes);
    const [signaturePda] = PublicKey.findProgramAddressSync(
      [hashedSignaturePubkey.toBuffer()],
      program.programId
    )

    try {
      await program.methods
        .withdraw({
          message: Buffer.from(ethers.toBeArray(dataHash)),
          signature: Buffer.from(ethers.toBeArray(sig)).toJSON().data,
          coupon: {
            address: data.address,
            amount: new anchor.BN(data.amount), // Intentionally invalid amount
          },
        })
        .accounts({
          payer: wallet.publicKey,
          receiver: wallet.publicKey,
          treasury: treasuryPDA,
          hashedSignaturePubkey: hashedSignaturePubkey,
          signaturePda: signaturePda
        })
        .rpc();
      // No assertion here, as an error is expected
    } catch (error) {
      const code = error.error.errorCode.code
      // Assert specific error code with informative message
      assert(
        code === 'InvalidDataHash',
        `Expected error with code 'InvalidDataHash' but got '${code}'`
      );
      return 
    }
    assert(false, 'Expected to error out with InvalidDataHash')
  });

  it('Fails to withdraw SOL due to invalid signature', async () => {
    const data = {
      address: '9gVndQ5SdugdFfGzyuKmePLRJZkCreKZ2iUTEg4agR5g',
      amount: '10000000'
    };
    const dataHash = "0x" + "04a9dd358a821b90a0523cbbb3b2ad3fbd8be75e09b132c5c129b65589774c9d";
    const sig = '0x' + 'fff722f41eb1cae151458c2d9acf16695984d1376a6a0a6ab56a385204f889370aec600906f278c5d9522d1df16ab50940827f96d7f62f61cd2ba33b28f2b7df';
    const sigHashed = crypto.createHash('sha256').update(ethers.toBeArray(sig)).digest();
    const sigHashedBytes = sigHashed.toJSON().data
    const hashedSignaturePubkey  = new PublicKey(sigHashedBytes);
    const [signaturePda] = PublicKey.findProgramAddressSync(
      [hashedSignaturePubkey.toBuffer()],
      program.programId
    )

    try {
      await program.methods
        .withdraw({
          message: Buffer.from(ethers.toBeArray(dataHash)),
          signature: Buffer.from(ethers.toBeArray(sig)).toJSON().data,
          coupon: {
            address: data.address,
            amount: new anchor.BN(data.amount),
          },
        })
        .accounts({
          payer: wallet.publicKey,
          receiver: wallet.publicKey,
          treasury: treasuryPDA,
          hashedSignaturePubkey: hashedSignaturePubkey,
          signaturePda: signaturePda
        })
        .rpc();
    } catch (error) {
      // Assert specific error code with informative message
      assert(
        error.error.errorCode.code === 'InvalidSignature',
        `Expected error with code 'InvalidSignature' but got '${error.error.errorCode.code}'`
      );
      return
    }
    assert(false, 'Expected to error out with InvalidSignature')
  });

  it('Fails to withdraw SOL due to invalid data hash', async () => {
    const data = {
      address: '9gVndQ5SdugdFfGzyuKmePLRJZkCreKZ2iUTEg4agR5g',
      amount: '10000000'
    };
    
    const dataHash = "0x" + "01a9dd358a821b90a0523cbbb3b2ad3fbd8be75e09b132c5c129b65589774c9d";
    const sig = '0x' + '24b7b5f75624d91797593af3cc6e473f6120a4eda25a344e94f4ccf0c9155a0327d55e9cb7a740b5b197f04055cfdf9fa7525ec398b2e80c5538dd98cbb14d89';
    const sigHashed = crypto.createHash('sha256').update(ethers.toBeArray(sig)).digest();
    const sigHashedBytes = sigHashed.toJSON().data
    const hashedSignaturePubkey  = new PublicKey(sigHashedBytes);
    const [signaturePda] = PublicKey.findProgramAddressSync(
      [hashedSignaturePubkey.toBuffer()],
      program.programId
    )

    try {
      await program.methods
        .withdraw({
          message: Buffer.from(ethers.toBeArray(dataHash)),
          signature: Buffer.from(ethers.toBeArray(sig)).toJSON().data,
          coupon: {
            address: data.address,
            amount: new anchor.BN(data.amount),
          },
        })
        .accounts({
          payer: wallet.publicKey,
          receiver: wallet.publicKey,
          treasury: treasuryPDA,
          hashedSignaturePubkey: hashedSignaturePubkey,
          signaturePda: signaturePda
        })
        .rpc();
    } catch (error) {
      // Assert specific error code with informative message
      assert(
        error.error.errorCode.code === 'InvalidDataHash',
        `Expected error with code 'InvalidDataHash' but got '${error.error.errorCode.code}'`
      );
      return
    }
    assert(false, 'Expected to error out with InvalidDataHash')
  });

  it('Fails to withdraw due to invalid signature pubkey', async () => {
    const data = {
      address: '9gVndQ5SdugdFfGzyuKmePLRJZkCreKZ2iUTEg4agR5g',
      amount: '10000000'
    };
    const dataHash = "0x" + "04a9dd358a821b90a0523cbbb3b2ad3fbd8be75e09b132c5c129b65589774c9d";
    const sig = '0x' + '24b7b5f75624d91797593af3cc6e473f6120a4eda25a344e94f4ccf0c9155a0327d55e9cb7a740b5b197f04055cfdf9fa7525ec398b2e80c5538dd98cbb14d89';
    const sigHashed = crypto.createHash('sha256').update(ethers.toBeArray(sig)).digest();
    const sigHashedBytes = sigHashed.toJSON().data
    const hashedSignaturePubkey  = new PublicKey(sigHashedBytes);
    const [signaturePda] = PublicKey.findProgramAddressSync(
      [hashedSignaturePubkey.toBuffer()],
      program.programId
    )
    
    const sigScam = '0x' + 'fff722f41eb1cae151458c2d9acf16695984d1376a6a0a6ab56a385204f889370aec600906f278c5d9522d1df16ab50940827f96d7f62f61cd2ba33b28f2b7df';
    const sigHashedScam = crypto.createHash('sha256').update(ethers.toBeArray(sigScam)).digest();
    const sigHashedBytesScam = sigHashedScam.toJSON().data
    const hashedSignaturePubkeyScam  = new PublicKey(sigHashedBytesScam);
    
    try {
      await program.methods
        .withdraw({
          message: Buffer.from(ethers.toBeArray(dataHash)),
          signature: Buffer.from(ethers.toBeArray(sig)).toJSON().data,
          coupon: {
            address: data.address,
            amount: new anchor.BN(data.amount),
          },
        })
        .accounts({
          payer: wallet.publicKey,
          receiver: wallet.publicKey,
          treasury: treasuryPDA,
          hashedSignaturePubkey: hashedSignaturePubkeyScam,
          signaturePda: signaturePda
        })
        .rpc();
    } catch (error) {
      const code = error.error.errorCode.code
          // Assert specific error code with informative message
          assert(
            code === 'ConstraintSeeds',
            `Expected error with code 'ConstraintSeeds' but got '${code}'`
          );
      return 
    }

    assert(false, 'Expected to error out with ConstraintSeeds')
  });

  it('Fails to withdraw due to invalid signature pda', async () => {
    const data = {
      address: '9gVndQ5SdugdFfGzyuKmePLRJZkCreKZ2iUTEg4agR5g',
      amount: '10000000'
    };
    const dataHash = "0x" + "04a9dd358a821b90a0523cbbb3b2ad3fbd8be75e09b132c5c129b65589774c9d";
    const sig = '0x' + '24b7b5f75624d91797593af3cc6e473f6120a4eda25a344e94f4ccf0c9155a0327d55e9cb7a740b5b197f04055cfdf9fa7525ec398b2e80c5538dd98cbb14d89';
    const sigHashed = crypto.createHash('sha256').update(ethers.toBeArray(sig)).digest();
    const sigHashedBytes = sigHashed.toJSON().data
    const hashedSignaturePubkey  = new PublicKey(sigHashedBytes);
    
    const sigScam = '0x' + 'fff722f41eb1cae151458c2d9acf16695984d1376a6a0a6ab56a385204f889370aec600906f278c5d9522d1df16ab50940827f96d7f62f61cd2ba33b28f2b7df';
    const sigHashedScam = crypto.createHash('sha256').update(ethers.toBeArray(sigScam)).digest();
    const sigHashedBytesScam = sigHashedScam.toJSON().data
    const hashedSignaturePubkeyScam  = new PublicKey(sigHashedBytesScam);
    const [signaturePdaScam] = PublicKey.findProgramAddressSync(
      [hashedSignaturePubkeyScam.toBuffer()],
      program.programId
    )

    try {
      await program.methods
        .withdraw({
          message: Buffer.from(ethers.toBeArray(dataHash)),
          signature: Buffer.from(ethers.toBeArray(sig)).toJSON().data,
          coupon: {
            address: data.address,
            amount: new anchor.BN(data.amount),
          },
        })
        .accounts({
          payer: wallet.publicKey,
          receiver: wallet.publicKey,
          treasury: treasuryPDA,
          hashedSignaturePubkey: hashedSignaturePubkey,
          signaturePda: signaturePdaScam
        })
        .rpc();
    } catch (error) {
      const code = error.error.errorCode.code
          // Assert specific error code with informative message
          assert(
            code === 'ConstraintSeeds',
            `Expected error with code 'ConstraintSeeds' but got '${code}'`
          );
      return 
    }

    assert(false, 'Expected to error out with ConstraintSeeds')
  });

  it('Fails to withdraw due to invalid signature pubkey and pda', async () => {
    const data = {
      address: '9gVndQ5SdugdFfGzyuKmePLRJZkCreKZ2iUTEg4agR5g',
      amount: '10000000'
    };
    const dataHash = "0x" + "04a9dd358a821b90a0523cbbb3b2ad3fbd8be75e09b132c5c129b65589774c9d";
    const sig = '0x' + '24b7b5f75624d91797593af3cc6e473f6120a4eda25a344e94f4ccf0c9155a0327d55e9cb7a740b5b197f04055cfdf9fa7525ec398b2e80c5538dd98cbb14d89';
    
    const sigScam = '0x' + 'fff722f41eb1cae151458c2d9acf16695984d1376a6a0a6ab56a385204f889370aec600906f278c5d9522d1df16ab50940827f96d7f62f61cd2ba33b28f2b7df';
    const sigHashedScam = crypto.createHash('sha256').update(ethers.toBeArray(sigScam)).digest();
    const sigHashedBytesScam = sigHashedScam.toJSON().data
    const hashedSignaturePubkeyScam  = new PublicKey(sigHashedBytesScam);
    const [signaturePdaScam] = PublicKey.findProgramAddressSync(
      [hashedSignaturePubkeyScam.toBuffer()],
      program.programId
    )

    try {
      await program.methods
        .withdraw({
          message: Buffer.from(ethers.toBeArray(dataHash)),
          signature: Buffer.from(ethers.toBeArray(sig)).toJSON().data,
          coupon: {
            address: data.address,
            amount: new anchor.BN(data.amount),
          },
        })
        .accounts({
          payer: wallet.publicKey,
          receiver: wallet.publicKey,
          treasury: treasuryPDA,
          hashedSignaturePubkey: hashedSignaturePubkeyScam,
          signaturePda: signaturePdaScam
        })
        .rpc();
    } catch (error) {
      const code = error.error.errorCode.code
          // Assert specific error code with informative message
          assert(
            code === 'KeysDontMatch',
            `Expected error with code 'KeysDontMatch' but got '${code}'`
          );
      return 
    }

    assert(false, 'Expected to error out with KeysDontMatch')
  });

  it('Withdraw SOL with valid signature and data', async () => {
    const data = {
      address: '9gVndQ5SdugdFfGzyuKmePLRJZkCreKZ2iUTEg4agR5g',
      amount: '10000000'
    };
    const dataHash = "0x" + "04a9dd358a821b90a0523cbbb3b2ad3fbd8be75e09b132c5c129b65589774c9d";
    const sig = '0x' + '24b7b5f75624d91797593af3cc6e473f6120a4eda25a344e94f4ccf0c9155a0327d55e9cb7a740b5b197f04055cfdf9fa7525ec398b2e80c5538dd98cbb14d89';
    const sigHashed = crypto.createHash('sha256').update(ethers.toBeArray(sig)).digest();
    const sigHashedBytes = sigHashed.toJSON().data
    const hashedSignaturePubkey  = new PublicKey(sigHashedBytes);
    const [signaturePda] = PublicKey.findProgramAddressSync(
      [hashedSignaturePubkey.toBuffer()],
      program.programId
    )

    const pdaLamportsInitial = (await getTreasuryPDA()).lamports;
    const walletBalanceInitial = await connection.getBalance(wallet.publicKey);

    // Call program method to withdraw SOL
    await program.methods
    .withdraw({
      message: Buffer.from(ethers.toBeArray(dataHash)),
      signature: Buffer.from(ethers.toBeArray(sig)).toJSON().data,
      coupon: {
        address: data.address,
        amount: new anchor.BN(data.amount),
      },
    })
    .accounts({
      payer: wallet.publicKey,
      receiver: wallet.publicKey,
      treasury: treasuryPDA,
      hashedSignaturePubkey: hashedSignaturePubkey,
      signaturePda: signaturePda
    })
    .rpc();

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
    const sigHashed = crypto.createHash('sha256').update(ethers.toBeArray(sig)).digest();
    const sigHashedBytes = sigHashed.toJSON().data
    const hashedSignaturePubkey  = new PublicKey(sigHashedBytes);
    const [signaturePda] = PublicKey.findProgramAddressSync(
      [hashedSignaturePubkey.toBuffer()],
      program.programId
    )

    try {
      await program.methods
        .withdraw({
          message: Buffer.from(ethers.toBeArray(dataHash)),
          signature: Buffer.from(ethers.toBeArray(sig)).toJSON().data,
          coupon: {
            address: data.address,
            amount: new anchor.BN(data.amount),
          },
        })
        .accounts({
          payer: wallet.publicKey,
          receiver: wallet.publicKey,
          treasury: treasuryPDA,
          hashedSignaturePubkey: hashedSignaturePubkey,
          signaturePda: signaturePda
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

  const getTreasuryPDA = async () => {
    return program.provider.connection.getAccountInfo(treasuryPDA)
  }
})