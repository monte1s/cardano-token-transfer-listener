import 'dotenv/config';
import Cardano from "@emurgo/cardano-serialization-lib-nodejs";
import { setupLogger } from './utils/logger.js';
import { getAddressTransactions, getTransactionInfo, submitTx, getUtxos } from "./services/koios.js";
// import { Lucid } from "lucid-cardano";
import { Lucid, Koios, toUnit } from "@lucid-evolution/lucid";

const lucid = await Lucid(new Koios("https://preprod.koios.rest/api/v1"), "Preprod");

const logger = setupLogger();

// Function to derive address from Ed25519 private key
function deriveAddressFromPrivateKey(privateKeyBech32, networkId = 0) {
    try {
        // Create private key from bytes
        const privateKey = Cardano.PrivateKey.from_bech32(privateKeyBech32);

        // Derive public key from private key
        const publicKey = privateKey.to_public();

        // Create base address (payment + stake credentials)
        const baseAddr = Cardano.BaseAddress.new(
            networkId, // 0 for mainnet, 1 for testnet
            Cardano.Credential.from_keyhash(publicKey.hash()),
            Cardano.Credential.from_keyhash(publicKey.hash())
        );

        // Convert to bech32 address
        const address = baseAddr.to_address().to_bech32();

        return {
            address: address,
            publicKey: publicKey.to_hex(),
            privateKey: privateKey.to_hex()
        };
    } catch (error) {
        console.error('Error deriving address:', error);
        throw error;
    }
}

// For testnet (networkId = 1) 

const ADDRESSES = [process.env.ADDRESS];
const PRIVATE_KEY = process.env.PRIVATE_KEY;

const seenTxs = new Set();

// Function to save transaction details and track transaction hash
async function saveTransaction(tx_info, address, amount, currency) {
    const txHash = tx_info.tx_hash;

    // Check if we've already seen this transaction
    if (seenTxs.has(txHash)) {
        logger.info(`Transaction ${txHash} already processed, skipping...`);
        return;
    }

    // Add transaction hash to seen set
    seenTxs.add(txHash);

    // Log the transaction details
    logger.info('New transaction detected:', {
        tx_hash: txHash,
        address: address,
        amount: amount,
        currency: currency,
        block_height: tx_info.block_height,
        block_time: tx_info.block_time
    });

    // Here you can add additional logic to save to database, send notifications, etc.
    console.log(`💰 New ${currency} deposit: ${amount} to ${address} (Tx: ${txHash})`);
}

async function pollDeposits() {
    const lastBlockHeight = 3000000;

    const transactions = await getAddressTransactions(ADDRESSES, Number(lastBlockHeight));
    if (transactions.length === 0) {
        logger.debug('No new transactions found');
        return;
    }

    logger.info(`Found ${transactions.length} transactions to process`);

    const tx_hashes = transactions.map(tx => tx.tx_hash);
    const tx_infos = await getTransactionInfo(tx_hashes);

    let newTransactionsCount = 0;

    for (const tx_info of tx_infos) {
        const tx = tx_info.outputs.find(output => {
            // Check if payment address is in our monitored addresses
            const addressMatch = ADDRESSES.includes(output.payment_addr.bech32);

            // Check if asset_list contains CHARLES_ADDRESS as policy_id
            const charlesAsset = output.asset_list?.find(asset =>
                asset.policy_id === process.env.CHARLES_ADDRESS
            );

            return addressMatch && charlesAsset;
        });

        if (tx) {
            const address = tx.payment_addr.bech32;
            const charlesAsset = tx.asset_list.find(asset =>
                asset.policy_id === process.env.CHARLES_ADDRESS
            );

            // Use quantity divided by decimals as amount
            const amount = charlesAsset.quantity / Math.pow(10, charlesAsset.decimals);
            const currency = Buffer.from(charlesAsset.asset_name, 'hex').toString('utf-8');

            // Check if this is a new transaction before saving
            if (!seenTxs.has(tx_info.tx_hash)) {
                newTransactionsCount++;
                await saveTransaction(tx_info, address, amount, currency);
            } else {
                logger.debug(`Skipping already processed transaction: ${tx_info.tx_hash}`);
            }
        }
    }

    if (newTransactionsCount > 0) {
        logger.info(`Processed ${newTransactionsCount} new transactions`);
    }
}

const sendAda = async (receiverAddress, amount) => {
    try {

        const testnetAddress = deriveAddressFromPrivateKey(process.env.PRIVATE_KEY_2, 0);
        const utxos = await lucid.utxosAt(testnetAddress.address);
        lucid.selectWallet.fromAddress(testnetAddress.address, utxos);

        const txBuilder = await lucid
            .newTx()
            .pay.ToAddress(receiverAddress, { lovelace: BigInt(amount) })
            .complete();
        const signedTx = await txBuilder.sign.withPrivateKey(process.env.PRIVATE_KEY_2).complete();
        const txHash = await signedTx.submit();
        console.log("Transaction Submitted:", txHash);

        return txHash;
    } catch (error) {
        console.log(error)
    }
}

const sendToken = async (receiverAddress, amount) => {
    try {
        // Native asset information
        const policyId = "5ad583d0aabeb7e2e3f57376cd25b444b0bb62737b52b2e0ff65e7ed";
        const assetName = "434841524c4553";
        const unit = toUnit(policyId, assetName);

        const senderAddress = deriveAddressFromPrivateKey(process.env.PRIVATE_KEY_2, 0);
        const feePayerAddress = deriveAddressFromPrivateKey(process.env.FEEPAYER_PRIVATE_KEY, 0);

        // ---- FETCH UTXOs ----
        const senderUtxos = await lucid.utxosAt(senderAddress.address);
        const feePayerUtxos = await lucid.utxosAt(feePayerAddress.address);

        // Pick UTxOs (you can use your own selection logic)
        const senderUtxo = senderUtxos.find(utxo =>
            utxo.assets[unit] && utxo.assets[unit] >= amount
        );
        if (!senderUtxo) throw new Error("Sender does not have enough tokens.");

        const feeUtxo = feePayerUtxos.find(utxo => utxo.assets["lovelace"] >= 2_000_000n);
        if (!feeUtxo) throw new Error("Fee payer does not have enough ADA.");

        // ---- BUILD TX ----
        lucid.selectWallet.fromAddress(feePayerAddress.address, feePayerUtxos);

        const tx = await lucid.newTx()
            .collectFrom([senderUtxo, feeUtxo])
            .pay.ToAddress(receiverAddress, { [unit]: amount })
            .complete();

        // ---- SIGN & SUBMIT ----
        const signedTx = await tx
            .sign.withPrivateKey(process.env.PRIVATE_KEY_2)
            .sign.withPrivateKey(process.env.FEEPAYER_PRIVATE_KEY)
            .complete();

        const txHash = await signedTx.submit();
        console.log("Transaction submitted with hash:", txHash);
    } catch (error) {
        console.log(error)
    }
}

const sendAdaOld = async (receiverAddress, amount) => {
    // 🔑 Derive key/address
    const privateKey = Cardano.PrivateKey.from_extended_bytes(
        Buffer.from(PRIVATE_KEY, "hex")
    );
    const publicKey = privateKey.to_public();
    const baseAddr = Cardano.BaseAddress.new(
        process.env.NETWORK_ID,
        Cardano.Credential.from_keyhash(publicKey.hash()),
        Cardano.Credential.from_keyhash(publicKey.hash())
    );
    const senderAddress = baseAddr.to_address().to_bech32();

    console.log("Sender address:", senderAddress);

    // 🔍 Get UTXOs
    const utxos = await getUtxos(senderAddress);

    if (utxos.length === 0) {
        throw new Error("No UTXOs found for address.");
    }

    // 🧱 Build Transaction
    const txBuilder = Cardano.TransactionBuilder.new(
        Cardano.TransactionBuilderConfigBuilder.new()
            .fee_algo(
                Cardano.LinearFee.new(
                    Cardano.BigNum.from_str("44"),
                    Cardano.BigNum.from_str("155381")
                )
            )
            .coins_per_utxo_byte(Cardano.BigNum.from_str("34482"))
            .pool_deposit(Cardano.BigNum.from_str("500000000"))
            .key_deposit(Cardano.BigNum.from_str("2000000"))
            .max_value_size(5000)
            .max_tx_size(16384)
            .build()
    );

    let totalInput = Cardano.BigNum.from_str("0");

    for (const utxo of utxos) {
        const input = Cardano.TransactionInput.new(
            Cardano.TransactionHash.from_bytes(Buffer.from(utxo.tx_hash, "hex")),
            parseInt(utxo.tx_index)
        );
        const amount = Cardano.Value.new(Cardano.BigNum.from_str(utxo.value));
        txBuilder.add_key_input(publicKey.hash(), input, amount);
        totalInput = totalInput.checked_add(Cardano.BigNum.from_str(utxo.value));
    }

    // ➡️ Add Output
    const sendAmount = Cardano.BigNum.from_str(amount.toString());
    txBuilder.add_output(
        Cardano.TransactionOutput.new(
            Cardano.Address.from_bech32(receiverAddress),
            Cardano.Value.new(sendAmount)
        )
    );

    // 🔁 Add change
    txBuilder.add_change_if_needed(Cardano.Address.from_bech32(senderAddress));

    // ✍️ Sign Transaction
    const txBody = txBuilder.build();
    const txBytes = txBody.to_bytes();
    const fixedTx = Cardano.FixedTransaction.new_from_body_bytes(txBytes);
    const txHash = fixedTx.transaction_hash();
    const witnesses = Cardano.TransactionWitnessSet.new();
    const vkeyWitnesses = Cardano.Vkeywitnesses.new();
    const vkeyWitness = Cardano.make_vkey_witness(txHash, privateKey);
    vkeyWitnesses.add(vkeyWitness);
    witnesses.set_vkeys(vkeyWitnesses);

    const signedTx = Cardano.Transaction.new(txBody, witnesses);
    const txHex = Buffer.from(signedTx.to_bytes()).toString("hex");

    try {
        // 📤 Submit via Koios v1
        const result = await submitTx(txHex);
        console.log("Transaction submitted! TX Hash:", result);
    } catch (error) {
        console.log("Error sending ADA:", error);
    }
}

export { pollDeposits, sendAda, sendToken };