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

/** Prefer WRIT_PASSWORD; POSTGRES_PASSWORD is an alternate name (e.g. some Postgres deployments). */
function dbPassword(): string {
    const value = process.env.WRIT_PASSWORD ?? process.env.POSTGRES_PASSWORD;
    if (!value) {
        throw new Error(
            'Missing required environment variable: WRIT_PASSWORD (or POSTGRES_PASSWORD)',
        );
    }
    return value;
}

const pool = new Pool({
    user: requireEnv('WRIT_USER'),
    password: dbPassword(),
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT) || 5432,
    database: requireEnv('PGDATABASE'),
});

export default pool;
