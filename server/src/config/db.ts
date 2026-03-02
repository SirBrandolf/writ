import { Pool } from 'pg';

const pool = new Pool({
    user: process.env.WRIT_USER,
    password: process.env.WRIT_PASSWORD,
    host: 'localhost',
    port: Number(process.env.PGPORT) || 5432,
    database: 'writ_db',
});

export default pool;
