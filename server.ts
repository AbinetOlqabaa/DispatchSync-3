import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

import { initSuperAdminBootstrap } from './src/server/security.js';
import authRoutes from './src/server/routes/authRoutes.js';
import dispatchRoutes from './src/server/routes/dispatchRoutes.js';
import partnerRoutes from './src/server/routes/partnerRoutes.js';
import auditRoutes from './src/server/routes/auditRoutes.js';
import systemRoutes from './src/server/routes/systemRoutes.js';
import locationRoutes from './src/server/routes/locationRoutes.js';
import notificationRoutes from './src/server/routes/notificationRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Initialize Super-Admin one-time bootstrap
  initSuperAdminBootstrap();

  app.use(express.json());

  // Security headers & Request Correlation ID
  app.use((req, res, next) => {
    const correlationId = (req.headers['x-correlation-id'] as string) || `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    res.setHeader('X-Correlation-ID', correlationId);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  // Mount API endpoints
  app.use('/api/auth', authRoutes);
  app.use('/api/dispatches', dispatchRoutes);
  app.use('/api/partners', partnerRoutes);
  app.use('/api/locations', locationRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/audit', auditRoutes);
  app.use('/api/system', systemRoutes);

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      time: new Date().toISOString(),
      service: 'DispatchBridge Kernel API',
    });
  });

  // Vite middleware in development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[DispatchBridge] Full-Stack Kernel active on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[DispatchBridge] Failed to launch server:', err);
  process.exit(1);
});
