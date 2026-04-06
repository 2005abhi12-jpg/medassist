const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const env = require('./config/env');
const connectDB = require('./config/db');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');
const { globalLimiter } = require('./middlewares/rateLimiter');
const { startJobs } = require('./jobs');
const logger = require('./utils/logger');

// ─── Create Express app ────────────────────────────
const app = express();

// ─── Security middleware ────────────────────────────
app.use(helmet());
app.set("trust proxy", 1);
app.use(cors({
  origin: "*",
  credentials: true
}));

app.use(globalLimiter);

// ─── Body parsing ───────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Request logging ────────────────────────────────
if (env.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ─── Health check ───────────────────────────────────
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'medassist-api',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ─── API routes ─────────────────────────────────────
app.use('/api/v1', routes);

// ─── 404 handler ────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: 'The requested endpoint does not exist',
      status: 404,
    },
  });
});

// ─── Global error handler ───────────────────────────
app.use(errorHandler);

// ─── Start server ───────────────────────────────────
async function startServer() {
  try {
    // Connect to MongoDB
    await connectDB();

    // Start cron jobs
    startJobs();

    // Listen
    const server = app.listen(env.port, () => {
      logger.info(`🚀 MedAssist API running on port ${env.port} [${env.nodeEnv}]`);
      logger.info(`   Health: http://localhost:${env.port}/health`);
      logger.info(`   API:    http://localhost:${env.port}/api/v1`);
    });

    const { Server } = require("socket.io");
    const io = new Server(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    global.io = io;

    io.on("connection", (socket) => {
      logger.info(`User connected via WebSocket: ${socket.id}`);
    });
  } catch (err) {
    logger.error(`Failed to start server: ${err.message}`);
    process.exit(1);
  }
}

startServer();

module.exports = app;
