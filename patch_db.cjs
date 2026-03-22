const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'server/.env') });

async function patchDB() {
    console.log('🛠️ Patching Cloud Database...');
    
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

        console.log('🛠️ Adding subcategory_id to incomes...');
        await connection.query('ALTER TABLE incomes ADD COLUMN subcategory_id INT AFTER category_id;');
        
        console.log('🛠️ Adding Foreign Key constraint...');
        await connection.query('ALTER TABLE incomes ADD CONSTRAINT fk_incomes_subcategory FOREIGN KEY (subcategory_id) REFERENCES subcategories(id) ON DELETE SET NULL;');

        console.log('💎 Database patched successfully!');
        await connection.end();
        console.log('🏁 Connection closed.');
    } catch (err) {
        if (err.code === 'ER_DUP_COLUMN_NAME') {
            console.log('ℹ️ Patch already applied.');
        } else {
            console.error('❌ Error patching database:', err);
        }
    }
}

patchDB();
