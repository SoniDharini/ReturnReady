import 'dotenv/config';
import app from './app.js';
import { connectDB } from './config/db.js';

const PORT = Number(process.env.PORT) || 5000;

async function start() {
  const required = ['MONGO_URI', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
  for (const key of required) {
    if (!process.env[key]) {
      console.error(`Missing required environment variable: ${key}`);
      process.exit(1);
    }
  }

  try {
    await connectDB(process.env.MONGO_URI);
  } catch {
    process.exit(1);
  }

  const server = app.listen(PORT, () => {
    console.log(`ReturnReady API listening on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });

  server.on('error', (error) => {
    if (error?.code === 'EADDRINUSE') {
      console.error(
        `Port ${PORT} is already in use.\n` +
          `Another ReturnReady backend is probably still running.\n` +
          `Fix: stop the other process (Ctrl+C in that terminal), then run: npm run dev\n` +
          `Or free the port in PowerShell:\n` +
          `  Get-NetTCPConnection -LocalPort ${PORT} | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force }`,
      );
      process.exit(1);
    }

    console.error('Failed to start server:', error.message);
    process.exit(1);
  });

  const shutdown = (signal) => {
    console.log(`${signal} received. Shutting down...`);
    server.close(() => process.exit(0));
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start();
