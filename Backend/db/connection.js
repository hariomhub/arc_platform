import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

// Verify connection on startup
pool.getConnection()
    .then((connection) => {
        console.log('✅ MySQL connected successfully to database:', process.env.DB_NAME);
        connection.release();
    })
    .catch((err) => {
        console.error('❌ MySQL connection failed:', err.message);
        process.exit(1);
    });

export default pool;
