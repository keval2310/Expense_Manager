const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Keval@2310',
    database: process.env.DB_NAME || 'expense_manager',
};

async function createAdmin() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log('Connected to database.');

        const email = 'keval123@abc.com';
        const password = 'keval2310';
        const hashedPassword = await bcrypt.hash(password, 10);

        // 1. Demote ALL existing admins to 'user' first to ensure exclusivity
        await connection.execute("UPDATE users SET role = 'user' WHERE role = 'admin'");
        console.log("Demoted all existing admins to 'user'.");

        // 2. Check if the specific admin user exists
        const [existing] = await connection.execute('SELECT * FROM users WHERE email = ?', [email]);

        if (existing.length > 0) {
            // Update existing user to admin and set password
            await connection.execute('UPDATE users SET password = ?, role = ?, name = ? WHERE email = ?', [hashedPassword, 'admin', 'Keval', email]);
            console.log('Updated user ' + email + ' to Admin role (Keval) with new password.');
        } else {
            // Create new admin user
            await connection.execute(
                'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
                ['Keval', email, hashedPassword, 'admin']
            );
            console.log('Created new Admin user (Keval): ' + email);
        }

        console.log('-----------------------------------');
        console.log('Global Admin Credentials Configured');
        console.log(`Email: ${email}`);
        console.log(`Password: ${password}`);
        console.log('-----------------------------------');

        await connection.end();
    } catch (error) {
        if (error.code === 'ER_BAD_DB_ERROR') {
            console.error('Database does not exist or wrong name. Check .env');
        } else {
            console.error('Error creating admin user:', error);
        }
    }
}

createAdmin();
