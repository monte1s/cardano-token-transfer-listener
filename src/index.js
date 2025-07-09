import 'dotenv/config';
import express from 'express';
import { pollDeposits, sendAda, sendToken } from "./monitor.js";
import { setupLogger } from './utils/logger.js';

const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON request bodies
app.use(express.json());

// Setup logger
const logger = setupLogger();

// setInterval(() => {
//   console.log("🔍 Checking for new deposits...");
//   pollDeposits();
// }, 30 * 1000); // poll every 30 seconds

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

app.post('/send-ada', (req, res) => {
  const { receiverAddress, amount } = req.body;
  sendAda(receiverAddress, amount);
  res.json({ status: 'success' });
});

app.post('/send-token', (req, res) => {
  const { receiverAddress, amount } = req.body;
  sendToken(receiverAddress, amount);
  res.json({ status: 'success' });
});

app.listen(port, () => {
  logger.info(`Server is running on port ${port}`);
}); 