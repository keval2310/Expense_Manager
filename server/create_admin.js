const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const path = require('path');
const readline = require('readline');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'expense_manager',
};

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

async function createAdmin() {
    try {
        const email = process.env.ADMIN_EMAIL || await ask('Admin email: ');
        const password = process.env.ADMIN_PASSWORD || await ask('Admin password: ');
        const name = process.env.ADMIN_NAME || await ask('Admin name: ');
        rl.close();

        const connection = await mysql.createConnection(dbConfig);
        console.log('Connected to database.');

        const hashedPassword = await bcrypt.hash(password, 10);

        // Demote ALL existing super_admins and admins to 'user' first to ensure exclusivity
        await connection.execute("UPDATE users SET role = 'user' WHERE role IN ('admin', 'super_admin')");
        console.log("Demoted all existing admins to 'user'.");

        // Check if the specific admin user exists
        const [existing] = await connection.execute('SELECT * FROM users WHERE email = ?', [email]);

        if (existing.length > 0) {
            await connection.execute('UPDATE users SET password = ?, role = ?, name = ? WHERE email = ?', [hashedPassword, 'super_admin', name, email]);
            console.log(`Updated user ${email} to Super Admin role (${name}) with new password.`);
        } else {
            await connection.execute(
                'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
                [name, email, hashedPassword, 'super_admin']
            );
            console.log(`Created new Super Admin user (${name}): ${email}`);
        }

        console.log('-----------------------------------');
        console.log('Admin account configured successfully.');
        console.log('-----------------------------------');

        await connection.end();
    } catch (error) {
        rl.close();
        if (error.code === 'ER_BAD_DB_ERROR') {
            console.error('Database does not exist or wrong name. Check .env');
        } else {
            console.error('Error creating admin user:', error);
        }
    }
}

createAdmin();
