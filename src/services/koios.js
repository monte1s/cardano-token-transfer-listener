import axios from "axios";
import { setupLogger } from '../utils/logger.js';
import 'dotenv/config';

const KOIOS_API_URL = "https://preprod.koios.rest/api/v1";

const client = axios.create({
  baseURL: KOIOS_API_URL,
});

const logger = setupLogger();

async function getUtxos(address) {
  const res = await client.post(`/address_info`, {
    _addresses: [address],
  });
  return res.data[0]?.utxo_set ?? [];
}

async function submitTx(txHex) {
  try {
    const txBytes = Buffer.from(txHex, "hex");
    console.log(txBytes, "txBytes");
    const res = await axios.post(
      "https://preprod.koios.rest/api/v1/submittx",
      { _tx_bytes: txBytes },
      {
        headers: {
          "Content-Type": "application/cbor",
        },
        responseType: "text",
      }
    );

    return res.data;
  } catch (error) {
    console.log('Error submitting transaction:', error.message);
    return null;
  }
}

async function getAddressTransactions(addresses, afterBlockHeight) {
  try {
    const response = await client.post(`/address_txs`, {
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
    const response = await client.post(`/tx_info`, {
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

export {
  getAddressTransactions,
  getTransactionInfo,
  getUtxos,
  submitTx
};
