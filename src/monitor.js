require("dotenv").config();
const { default: axios } = require("axios");
const { setupLogger } = require('./utils/logger');

const logger = setupLogger();
const KOIOS_API_URL = "https://preprod.koios.rest/api/v1";

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

async function getAddressTransactions(addresses, afterBlockHeight) {
    try {
        const response = await axios.post(`${KOIOS_API_URL}/address_txs`, {
            _addresses: addresses,
            _after_block_height: afterBlockHeight
        });
        return response.data;
    } catch (error) {
        logger.error('Error fetching address transactions:', error.message);
        return [];
    }
}

async function getTransactionInfo(tx_hashs) {
    try {
        const response = await axios.post(`${KOIOS_API_URL}/tx_info`, {
            _tx_hashes: tx_hashs,
            _assets: true,
            _inputs: false,
            _metadata: false,
            _withdrawals: false,
            _certs: false,
            _scripts: false,
            _bytecode: false
        });
        return response.data;
    } catch (error) {
        logger.error('Error fetching address transactions:', error.message);
        return [];
    }
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

module.exports = { pollDeposits };