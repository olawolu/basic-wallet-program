import * as anchor from "@coral-xyz/anchor";
import { BN,Program } from "@coral-xyz/anchor";
import { BasicWalletProgram } from "../target/types/basic_wallet_program";
import { Keypair, LAMPORTS_PER_SOL, PublicKey, sendAndConfirmTransaction, SystemProgram, Transaction } from "@solana/web3.js";
import { expect } from "chai";

describe("basic-wallet-program", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const passKey = anchor.web3.Keypair.generate();
  const w = new anchor.Wallet(passKey)
  new anchor.AnchorProvider(provider.connection, w)

  const program = anchor.workspace.BasicWalletProgram as Program<BasicWalletProgram>;
  const user = provider.wallet as anchor.Wallet;

  passKey.secretKey
  console.log("passKeyBytes", passKey.publicKey.toBytes())

  const [PDA, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from("pda"), passKey.publicKey.toBytes()],
    program.programId,
  );
  console.log("PDA: ", PDA)
  it("Is initialized!", async () => {
    new anchor.web3.TransactionInstruction({
      keys: [
        {
          pubkey: PDA,
          isSigner: false,
          isWritable: true
        },
        {
          pubkey: user.publicKey,
          isSigner: true,
          isWritable: true
        },
      ],
      programId: program.programId,
    })

    const transactionSignature = await program.methods
      .initialize([...passKey.publicKey.toBytes()])
      .accountsPartial({
        pdaAccount: PDA,
        sponsor: user.publicKey
      })
      // .signers([user])
      .rpc();
   
    console.log("Transaction Signature:", transactionSignature);

  });
   
  // it("Fetch Account", async () => {
  //   const pdaAccount = await program.account.walletAccount.fetch(PDA);
  //   console.log(JSON.stringify(pdaAccount, null, 2));

  //   // const transactionSignature = await program.methods.validateAccount([...passKey.publicKey.toBytes()])
  //   //   .accountsPartial({
  //   //     pdaAccount: PDA,
  //   //     recipient: user.publicKey,
  //   //   })
  //   //   .rpc()

  //   //   console.log("Transaction Signature:", transactionSignature);
  // });
  
  it("Sends SOL to PDA", async () => {
    const fromKeypair = Keypair.generate();
   
    const airdropSignature = await provider.connection.requestAirdrop(
      fromKeypair.publicKey,
      LAMPORTS_PER_SOL,
    );

    await provider.connection.confirmTransaction(airdropSignature);

    const accountBalance = await provider.connection.getBalance(PDA)
    console.log(accountBalance)

    // Define the amount to transfer
    const transferAmount = 0.5 * LAMPORTS_PER_SOL; // 0.01 SOL
    console.log("transferAmount: ", transferAmount)
  
    // Create a transfer instruction for transferring SOL from wallet_1 to wallet_2
    const transferInstruction = SystemProgram.transfer({
      fromPubkey: fromKeypair.publicKey,
      toPubkey: PDA,
      lamports: transferAmount,
    });

    const transactionSignature = new Transaction().add(transferInstruction)
    console.log("Transaction Signature:", transactionSignature);

    await sendAndConfirmTransaction(provider.connection, transactionSignature, [fromKeypair])
    const newAccountBallance = await provider.connection.getBalance(PDA)
    console.log(newAccountBallance)
    

    expect(newAccountBallance).to.equal(accountBalance + transferAmount)
  })

  it("Sends out SOL", async () => {
    const toKeypair = Keypair.generate();
    const pdaAccount = await program.account.walletAccount.fetch(PDA);

    console.log("PDA: ", PDA)
    console.log("passKeyBytes", passKey.publicKey.toBytes())

    const transaction = await program.methods
      .transferSol(new BN(10000000))
      .accountsPartial({
        pdaAccount: PDA,
        recipient: toKeypair.publicKey,
        sponsor: user.publicKey,
      })
      .rpc()

      // await getBalances(PDA, toKeypair.publicKey, 'Resulting');
  })


  async function getBalances(payerPubkey: PublicKey, recipientPubkey: PublicKey, timeframe: string) {
    const payerBalance = await provider.connection.getBalance(payerPubkey);
    const recipientBalance = await provider.connection.getBalance(recipientPubkey);
    console.log(`${timeframe} balances:`);
    console.log(`   Payer: ${payerBalance / LAMPORTS_PER_SOL}`);
    console.log(`   Recipient: ${recipientBalance / LAMPORTS_PER_SOL}`);
  }
});