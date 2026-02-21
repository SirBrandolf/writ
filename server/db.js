const Pool = require('pg').Pool;

const pool = new Pool({
    user: process.env.WRIT_USER,
    password: process.env.WRIT_PASSWORD,
    host: 'localhost', 
    port: 5432,
    database: 'writ_db'
});

module.exports = pool;
