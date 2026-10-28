import { Router } from 'express';
import { blockchainController } from '../controllers/blockchain.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/status', (req, res, next) =>
  blockchainController.getStatus(req, res, next)
);

export default router;
