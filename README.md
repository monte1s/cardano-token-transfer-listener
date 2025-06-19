# Cardano Token Transfer Listener

This Node.js application monitors specified Cardano addresses for incoming token transfers and triggers events when transactions occur.

## Features

- Monitors multiple Cardano addresses for incoming transactions
- Captures transaction details (hash, amount, sender, receiver, timestamp)
- Real-time transaction monitoring using Cardano GraphQL API
- Logging system for tracking events and errors
- REST API endpoint for health checks

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Cardano addresses to monitor

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd cardano-token-transfer-listener
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```
CARDANO_GRAPHQL_URL=https://graphql-api.mainnet.dandelion.link/
MONITORED_ADDRESSES=addr1qxck...,addr1qyck...
PORT=3000
LOG_LEVEL=info
```

Replace the `MONITORED_ADDRESSES` with your actual Cardano addresses (comma-separated).

## Running the Application

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## Project Structure

```
├── src/
│   ├── index.js              # Application entry point
│   ├── services/
│   │   └── transactionMonitor.js  # Transaction monitoring logic
│   └── utils/
│       └── logger.js         # Logging configuration
├── .env                      # Environment variables
├── package.json             # Project dependencies
└── README.md                # Project documentation
```

## Transaction Data

When a transaction is detected, the following data is captured:
- Transaction hash
- Block number
- Timestamp
- Sender address
- Receiver address
- Amount

## Customization

To add custom logic when a transaction is detected, modify the `processTransaction` function in `src/services/transactionMonitor.js`. You can:
- Save transactions to a database
- Trigger webhooks
- Send notifications
- Implement custom business logic

## Error Handling

The application includes comprehensive error handling and logging:
- All errors are logged to `error.log`
- General logs are stored in `combined.log`
- Console output is available in development mode

## API Endpoints

- `GET /health` - Health check endpoint

## Contributing

Feel free to submit issues and enhancement requests! 