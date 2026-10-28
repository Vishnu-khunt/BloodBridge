import { Router } from 'express';
import authRoutes from './auth.routes';
import organizationRoutes from './organization.routes';
import donorRoutes from './donor.routes';
import inventoryRoutes from './inventory.routes';
import requestRoutes from './request.routes';
import adminRoutes from './admin.routes';
import blockchainRoutes from './blockchain.routes';

const apiRouter = Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/organizations', organizationRoutes);
apiRouter.use('/donors', donorRoutes);
apiRouter.use('/inventory', inventoryRoutes);
apiRouter.use('/requests', requestRoutes);
apiRouter.use('/admin', adminRoutes);
apiRouter.use('/blockchain', blockchainRoutes);

// System health endpoint
apiRouter.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'BloodBridge Core Verification Backend',
    version: '1.0.0',
  });
});

export default apiRouter;
