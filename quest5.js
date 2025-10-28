// SPDX-License-Identifier: MIT
// quest5.js
// Path payments - send or receive an asset that is different from the received or sent asset

import StellarSdk from '@stellar/stellar-sdk';
const { Keypair, Horizon, TransactionBuilder, Networks, Operation, Asset } = StellarSdk;

async function friendbotFund(addr) {
    const res = await fetch(`https://friendbot.stellar.org?addr=${addr}`);
    if (!res.ok) throw new Error(`Friendbot failed for ${addr}: ${res.status} - ${await res.text()}`);
    console.log('✅ Funded:', addr);
}

const questKeypair = Keypair.fromSecret('SADDUVZ67AVUPQ7FE4IEEHEM3PDR3PVNXAQKQVBQESXRH6AHEDIVWOSD');
const issuerKeypair = Keypair.random();
const distributorKeypair = Keypair.random();
const destinationKeypair = Keypair.random();

// Fund accounts
await friendbotFund(questKeypair.publicKey());
await friendbotFund(destinationKeypair.publicKey());
await friendbotFund(issuerKeypair.publicKey());
await friendbotFund(distributorKeypair.publicKey());

// ⬇️ Use Horizon.Server (not Server)
const server = new Horizon.Server('https://horizon-testnet.stellar.org');

const questAccount = await server.loadAccount(questKeypair.publicKey());
const fee = await server.fetchBaseFee();

// Setup custom asset
const pathAsset = new Asset("PATH", issuerKeypair.publicKey());

const tx = new TransactionBuilder(questAccount, {
    fee: fee.toString(),
    networkPassphrase: Networks.TESTNET,
})
    .addOperation(Operation.changeTrust({
        asset: pathAsset,
        source: destinationKeypair.publicKey()
    }))
    .addOperation(Operation.changeTrust({
        asset: pathAsset,
        source: distributorKeypair.publicKey()
    }))
    .addOperation(Operation.payment({
        destination: distributorKeypair.publicKey(),
        asset: pathAsset,
        amount: '1000000',
        source: issuerKeypair.publicKey()
    }))
    .addOperation(Operation.createPassiveSellOffer({
        selling: pathAsset,
        buying: Asset.native(),
        amount: '2000',
        price: '1',
        source: distributorKeypair.publicKey()
    }))
    .addOperation(Operation.createPassiveSellOffer({
        selling: Asset.native(),
        buying: pathAsset,
        amount: '2000',
        price: '1',
        source: distributorKeypair.publicKey()
    }))
    .addOperation(Operation.pathPaymentStrictSend({
        sendAsset: Asset.native(),
        sendAmount: '1000',
        destination: destinationKeypair.publicKey(),
        destAsset: pathAsset,
        destMin: '1000',
    }))
    .addOperation(Operation.pathPaymentStrictReceive({
        sendAsset: pathAsset,
        sendMax: '450',
        destination: questKeypair.publicKey(),
        destAsset: Asset.native(),
        destAmount: '450',
        source: destinationKeypair.publicKey()
    }))
    .setTimeout(30)
    .build();

tx.sign(
    questKeypair,
    distributorKeypair,
    destinationKeypair,
    issuerKeypair);

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
