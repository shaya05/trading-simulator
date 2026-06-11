# Stock Trading Simulator
I'm creating a **Claude** and **Yahoo Finance API**-powered **stock market simulator** with live, accurate data from US stock markets to provide beginner traders with a platform to practice trading and research stocks without risking hard-earned money. Vaguely inspired by past finance-based hackathon projects, but it's moreso to assist me in my own finance and trading education so I can dip my toe into investing. And who doesn't love a good market UI :)

## Tools Used
- **Github** to host the files, VS Code for coding
- **Github Copilot** to assist with coding the project (my first venture into vibe coding!)
- **Gemini** to serve as the agent that will research companies to provide recent news, trends, and information to allow traders to make informed decisions on engaging with those stocks
- **MongoDB** to save user accounts, portfolios, history, and more user-based information
- **Yahoo Finance API** to provide live stock market data for an accurate, realistic simulation

- **React + Vite** to serve as the frontend for the web application
- **Express** to connect the application to MongoDB
- **JWT** to perform authorization to check sessions and users (MongoDB handles the actual credentials)
## Project Structure

- `client` - React frontend
- `server` - Express backend with JWT auth, MongoDB models, Yahoo Finance data, Gemini analysis, and WebSocket price pushes

## Features

- Register and login with JWT + bcrypt
- Starting simulated cash balance of `$10,000`
- Live quotes, price history, and stock search from `yahoo-finance2`
- Buy/sell stock and option trades tracked in MongoDB
- Limit and stop orders processed every 60 seconds
- Portfolio view with positions, P/L, and cash balance
- Research view that sends Yahoo quote summary data to Gemini for analysis
- Protected API routes with JWT middleware
- WebSocket quote updates every 60 seconds

## Environment Variables

### Server

- `PORT` - Backend port, default `4000`
- `MONGODB_URI` - MongoDB Atlas connection string
- `JWT_SECRET` - JWT signing secret
- `CORS_ORIGIN` - Allowed frontend origin, default `http://localhost:5173`
- `GEMINI_API_KEY` - Google Gemini API key
- `GEMINI_MODEL` - Gemini model name, default `gemini-2.0-flash`
- `MARKET_UPDATE_INTERVAL_SECONDS` - WebSocket refresh interval, default `60`
- `ORDER_CHECK_INTERVAL_SECONDS` - Pending order processor interval, default `60`

### Client

- `VITE_API_URL` - Backend API base URL, default `http://localhost:4000/api`

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy the example env files and fill in your secrets:

- `server/.env.example`
- `client/.env.example`

3. Run both apps:

```bash
npm run dev
```