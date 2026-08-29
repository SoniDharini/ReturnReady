import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.routes.js';
import propertyRoutes from './routes/property.routes.js';
import tenancyRoutes from './routes/tenancy.routes.js';
import invitationRoutes from './routes/invitation.routes.js';
import inspectionRoutes from './routes/inspection.routes.js';
import settlementRoutes from './routes/settlement.routes.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';
import { UPLOADS_ROOT } from './middleware/upload.middleware.js';
import { corsOrigin } from './config/cors.js';

const app = express();

app.set('trust proxy', 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);
app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  }),
);
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(cookieParser());
app.use('/uploads', express.static(UPLOADS_ROOT));

app.get('/api/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'ReturnReady API is running',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/tenancies', tenancyRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/inspections', inspectionRoutes);
app.use('/api/settlement', settlementRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
