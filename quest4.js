// SPDX-License-Identifier: MIT
// quest4.js
import StellarSdk from '@stellar/stellar-sdk';
const { Keypair, Horizon, TransactionBuilder, Networks, Operation, Asset } = StellarSdk;

const questKeypair = Keypair.fromSecret('INPUT SECRET_KEY');
//const issuerKeypair = Keypair.random();

async function friendbotFund(addr) {    
  const res = await fetch(`https://friendbot.stellar.org?addr=${addr}`);
  if (!res.ok) throw new Error(`Friendbot failed for ${addr}: ${res.status} - ${await res.text()}`);
  console.log('✅ Funded:', addr);
}

//await friendbotFund(questKeypair.publicKey());
//await friendbotFund(issuerKeypair.publicKey());

// ⬇️ Use Horizon.Server (not Server)
const server = new Horizon.Server('https://horizon-testnet.stellar.org');

const questAccount = await server.loadAccount(questKeypair.publicKey());
const fee = await server.fetchBaseFee();

//create asset
const usdcAsset = new Asset("USDC",'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5');

// Setting Trustline
const tx = new TransactionBuilder(questAccount, {
  fee: fee.toString(),
  networkPassphrase: Networks.TESTNET,
})
  .addOperation(Operation.changeTrust({
    asset: usdcAsset    
  }))
 .addOperation(Operation.manageBuyOffer({
    selling: Asset.native(),
    buying: usdcAsset,
    buyAmount: '100',
    price: '10',
    offerID: '0',
    source: questKeypair.publicKey()   
  }))
   .addOperation(Operation.manageSellOffer({
    selling: Asset.native(),
    buying: usdcAsset,
    amount: '1000',
    price: '0.1',
    offerID: '0',
    source: questKeypair.publicKey()   
  }))
  .addOperation(Operation.createPassiveSellOffer({
    selling: Asset.native(),
    buying: usdcAsset,
    amount: '1000',
    price: '0.1',    
    source: questKeypair.publicKey()   
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

