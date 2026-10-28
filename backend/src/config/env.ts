import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  DATABASE_URL: z.string().optional(),
  USE_IN_MEMORY_DB: z
    .string()
    .optional()
    .transform((val) => val === 'true' || val === '1' || !process.env.DATABASE_URL),
  JWT_SECRET: z
    .string()
    .min(16, 'JWT_SECRET must be at least 16 characters long')
    .default('super_secret_jwt_signing_key_32_characters_minimum_length_bloodbridge'),
  JWT_EXPIRES_IN: z.string().default('1d'),
  BLOCKCHAIN_RPC_URL: z.string().default('http://127.0.0.1:8545'),
  RELAYER_PRIVATE_KEY: z
    .string()
    .default('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'),
  REGISTRY_CONTRACT_ADDRESS: z
    .string()
    .default('0x5FbDB2315678afecb367f032d93F642f64180aa3'),
  REQUEST_MANAGER_CONTRACT_ADDRESS: z
    .string()
    .default('0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512'),
  AUDIT_ANCHOR_CONTRACT_ADDRESS: z
    .string()
    .default('0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0'),
});

export const env = envSchema.parse(process.env);
