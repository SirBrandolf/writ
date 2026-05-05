/** Shared pg Pool for the app; WRIT_* + PG* vars come from loaded env (see config/env). */
import { Pool } from 'pg';
import './env.js';

function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}

const pool = new Pool({
    user: requireEnv('WRIT_USER'),
    password: requireEnv('WRIT_PASSWORD'),
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT) || 5432,
    database: requireEnv('PGDATABASE'),
});

export default pool;
