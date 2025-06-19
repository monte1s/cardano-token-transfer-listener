const axios = require("axios");
require("dotenv").config();

const API_KEY = process.env.KOIOS_API_KEY;
const NETWORK = process.env.NETWORK || "mainnet";

const API_BASE = `https://${NETWORK}.koios.rest/api/v1`;

const client = axios.create({
  baseURL: API_BASE,
});

async function getAddressTransactions(address) {
  const response = await client.post(`/address_txs`, {
    _addresses: [
      "addr_test1qzts3qv4ny6n2l4sk35y4gcdch7xhzv487pks07hsxjt9mxtpu0vazwrsuc4equqxvfm28hpy6avsfxexrdgpmvxmarskxkadq",
    ],
    _after_block_height: 9417,
  });
  return response.data; // returns array of tx hashes
}

async function getTransactionDetails(txHash) {
  const response = await client.get(`/txs/${txHash}`);
  return response.data;
}

async function getTransactionUtxos(txHash) {
  const response = await client.get(`/txs/${txHash}/utxos`);
  return response.data;
}

module.exports = {
  getAddressTransactions,
  getTransactionDetails,
  getTransactionUtxos,
};
