// SPDX-License-Identifier: MIT
// quest6.js
// Account merge - Delete an account by transfering its XLM balance to another account

import StellarSdk from '@stellar/stellar-sdk';
const { Keypair, Horizon, TransactionBuilder, Networks, Operation, Asset } = StellarSdk;

const questKeypair = Keypair.fromSecret('SECRET_KEY');
const destinationKeypair = Keypair.random();

async function friendbotFund(addr) {
  const res = await fetch(`https://friendbot.stellar.org?addr=${addr}`);
  if (!res.ok) throw new Error(`Friendbot failed for ${addr}: ${res.status} - ${await res.text()}`);
  console.log('✅ Funded:', addr);
}

await friendbotFund(questKeypair.publicKey());
await friendbotFund(destinationKeypair.publicKey());

// ⬇️ Use Horizon.Server (not Server)
const server = new Horizon.Server('https://horizon-testnet.stellar.org');

const questAccount = await server.loadAccount(questKeypair.publicKey());
const fee = await server.fetchBaseFee();

const tx = new TransactionBuilder(questAccount, {
  fee: fee.toString(),
  networkPassphrase: Networks.TESTNET,
})
  .addOperation(Operation.accountMerge({
    destination: destinationKeypair.publicKey()
  }))
  .setTimeout(30)
  .build();

tx.sign(questKeypair);

try {
  const res = await server.submitTransaction(tx);
  console.log(`🎉 Transaction Successful! Hash: ${res.hash}`);
} catch (error) {
  if (error?.response?.data?.extras) {
    console.error('❌ Error sending transaction:\n', JSON.stringify(error.response.data.extras, null, 2));
  } else {
    console.error(error);
  }
}
