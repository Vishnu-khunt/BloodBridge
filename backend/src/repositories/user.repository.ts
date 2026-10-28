import { db } from '../db/client';
import { User } from '../types';

export class UserRepository {
  async findById(id: string): Promise<User | null> {
    const res = await db.query<User>('SELECT * FROM users WHERE id = $1', [id]);
    return res.rows[0] || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const res = await db.query<User>('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [
      email,
    ]);
    return res.rows[0] || null;
  }

  async create(user: {
    email: string;
    password_hash: string;
    role: string;
    full_name: string;
    phone?: string | null;
  }): Promise<User> {
    const res = await db.query<User>(
      `INSERT INTO users (email, password_hash, role, full_name, phone)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [user.email, user.password_hash, user.role, user.full_name, user.phone || null]
    );
    return res.rows[0];
  }
}

export const userRepository = new UserRepository();
