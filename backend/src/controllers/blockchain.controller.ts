import { Request, Response, NextFunction } from 'express';
import { blockchainService } from '../services/blockchain.service';
import { db } from '../db/client';
import { env } from '../config/env';

export class BlockchainController {
  async getStatus(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const isConnected = await blockchainService.checkConnection();
      const relayerAddress = blockchainService.getRelayerAddress();

      const txs = await db.query(
        `SELECT * FROM blockchain_transactions ORDER BY created_at DESC LIMIT 10`
      );

      res.status(200).json({
        network: 'Hardhat Localhost (Chain ID: 31337)',
        rpcUrl: env.BLOCKCHAIN_RPC_URL,
        isConnected,
        relayerAddress,
        contracts: {
          BloodBridgeRegistry: env.REGISTRY_CONTRACT_ADDRESS,
          BloodBridgeRequestManager: env.REQUEST_MANAGER_CONTRACT_ADDRESS,
          BloodBridgeAuditAnchor: env.AUDIT_ANCHOR_CONTRACT_ADDRESS,
        },
        recentTransactions: txs.rows,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const blockchainController = new BlockchainController();
