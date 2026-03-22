const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'server/.env') });

async function initDB() {
    console.log('🚀 Initializing Cloud Database...');
    
    const config = {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT,
        ssl: { rejectUnauthorized: false },
        multipleStatements: true
    };

    try {
        const connection = await mysql.createConnection(config);
        console.log('✅ Connected to Aiven Cloud!');

        const sql = fs.readFileSync(path.join(__dirname, 'database_setup.sql'), 'utf8');
        console.log('🛠️ Executing SQL script...');

        await connection.query(sql);
        console.log('💎 Database initialized successfully!');
        
        await connection.end();
        console.log('🏁 Connection closed.');
    } catch (err) {
        console.error('❌ Error initializing database:', err);
    }
}

initDB();
