require("dotenv").config();
const {
    getAddressTransactions,
    getTransactionDetails,
    getTransactionUtxos,
} = require("./services/blockfrost.js");

const ADDRESSES = [
    "addr1q8y7g9jx99ch8af46p2y39a5yhqgjqpjk9aksvx69uyesekfustyv2t3w06nt5z5fztmgfwq3yqr9vtmdqcd5tcfnpnq686r9y"
];

const seenTxs = new Set();

async function pollDeposits() {
    for (const address of ADDRESSES) {
        try {
            const txs = await getAddressTransactions(address);
            console.log(txs);
            // for (const tx of txs) {
            //     if (seenTxs.has(tx.tx_hash)) continue;

            //     seenTxs.add(tx.tx_hash);

            //     const [details, utxos] = await Promise.all([
            //         getTransactionDetails(tx.tx_hash),
            //         getTransactionUtxos(tx.tx_hash),
            //     ]);

            //     const timestamp = new Date(details.block_time * 1000).toISOString();
            //     const txHash = details.hash;

            //     const outputs = utxos.outputs.filter(o => o.address === address);
            //     for (const output of outputs) {
            //         for (const amount of output.amount) {
            //             if (amount.unit === "lovelace") continue; // skip ADA if you want only token

            //             const depositData = {
            //                 txHash,
            //                 timestamp,
            //                 to: address,
            //                 from: utxos.inputs[0]?.address || "unknown",
            //                 amount: amount.quantity,
            //                 token: amount.unit,
            //             };

            //             console.log("🔔 Deposit detected:", depositData);
            //             // Here you can: call DB save function, trigger Webhook, etc.
            //         }
            //     }
            // }
        } catch (err) {
            console.error("Error polling address:", address, err.message);
        }
    }
}

module.exports = { pollDeposits };