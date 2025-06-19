require('dotenv').config();
const express = require('express');
const { pollDeposits } = require("./monitor");
const { setupLogger } = require('./utils/logger');

const app = express();
const port = process.env.PORT || 3000;

// Setup logger
const logger = setupLogger();

setInterval(() => {
  console.log("🔍 Checking for new deposits...");
  pollDeposits();
}, 30 * 1000); // poll every 30 seconds

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

app.listen(port, () => {
  logger.info(`Server is running on port ${port}`);
}); 