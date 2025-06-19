const axios = require("axios");
require("dotenv").config();

const API_KEY = process.env.BLOCKFROST_API_KEY;
const NETWORK = process.env.NETWORK || 'mainnet';

const API_BASE = `https://cardano-${NETWORK}.blockfrost.io/api/v0`;

const client = axios.create({
  baseURL: API_BASE,
  headers: {
    project_id: API_KEY,
  },
});

async function getAddressTransactions(address) {
  const response = await client.get(`/addresses/${address}/transactions`);
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