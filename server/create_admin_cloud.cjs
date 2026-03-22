const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function createAdmin() {
    console.log('🛡️ Creating Cloud Super Admin...');
    
    const config = {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT,
        ssl: { rejectUnauthorized: false }
    };

    try {
        const connection = await mysql.createConnection(config);
        console.log('✅ Connected to Aiven Cloud!');

        const hashedPassword = await bcrypt.hash('keval2310', 10);
        const [result] = await connection.execute(
            'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            ['Keval', 'keval192837@gmail.com', hashedPassword, 'super_admin']
        );

        console.log('👤 Cloud Admin created successfully ID:', result.insertId);
        await connection.end();
        console.log('🏁 Connection closed.');
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            console.log('ℹ️ Admin already exists in Cloud.');
        } else {
            console.error('❌ Error creating Admin:', err);
        }
    }
}

createAdmin();
