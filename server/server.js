const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'; // Change in production

// Create uploads directory if not exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadDir)); // Serve uploaded files

// Database connection config
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Keval@2310',
    database: process.env.DB_NAME || 'expense_manager',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// Create a connection pool
const pool = mysql.createPool(dbConfig);

// Test connection
pool.getConnection()
    .then(connection => {
        console.log('Connected to MySQL database!');
        connection.release();
    })
    .catch(err => {
        console.error('Error connecting to MySQL:', err);
    });

// Middleware: Verify JWT Token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// API Routes

// --- Authentication (Week 7) ---

// Register
app.post('/api/auth/register', async (req, res) => {
    const { name, email, password, role } = req.body;
    try {
        // Check if user exists
        const [existing] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Email already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert user
        const [result] = await pool.query(
            'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            [name, email, hashedPassword, role || 'user']
        );

        const userId = result.insertId;
        const token = jwt.sign({ id: userId, email, role: role || 'user' }, JWT_SECRET, { expiresIn: '24h' });

        res.json({ success: true, token, user: { id: userId, name, email, role: role || 'user' } });
    } catch (err) {
        console.error('Error registering user:', err);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(400).json({ error: 'User not found' });
        }

        const user = users[0];
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ error: 'Invalid password' });
        }

        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ success: true, token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } catch (err) {
        console.error('Error logging in:', err);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Get Current User
app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        const [users] = await pool.query('SELECT id, name, email, role FROM users WHERE id = ?', [req.user.id]);
        if (users.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json({ user: users[0] });
    } catch (err) {
        console.error('Error fetching current user:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// --- File Upload (Week 9) ---
app.post('/api/upload', authenticateToken, upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ success: true, fileUrl });
});

// --- Core Features & Pagination/Search (Week 8 & 9) ---

// 1. Get Categories (Public or User Specific? Assuming public for now or all users see all categories)
app.get('/api/categories', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM categories');
        res.json({ categories: rows });
    } catch (err) {
        console.error('Error fetching categories:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Create Category
app.post('/api/categories', authenticateToken, async (req, res) => {
    const { name, type } = req.body;
    try {
        const [result] = await pool.query('INSERT INTO categories (name, type) VALUES (?, ?)', [name, type]);
        res.json({ success: true, id: result.insertId });
    } catch (err) {
        console.error('Error creating category:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.put('/api/categories/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { name, type } = req.body;
    try {
        await pool.query('UPDATE categories SET name=?, type=? WHERE id=?', [name, type, id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Error updating category:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.delete('/api/categories/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM categories WHERE id=?', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting category:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// 2. Get Subcategories
app.get('/api/subcategories', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM subcategories');
        const formatted = rows.map(r => ({
            id: r.id,
            name: r.name,
            categoryId: r.category_id
        }));
        res.json({ subcategories: formatted });
    } catch (err) {
        console.error('Error fetching subcategories:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/subcategories', authenticateToken, async (req, res) => {
    const { name, categoryId } = req.body;
    try {
        const [result] = await pool.query('INSERT INTO subcategories (name, category_id) VALUES (?, ?)', [name, categoryId]);
        res.json({ success: true, id: result.insertId });
    } catch (err) {
        console.error('Error creating subcategory:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.put('/api/subcategories/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { name, categoryId } = req.body;
    try {
        await pool.query('UPDATE subcategories SET name=?, category_id=? WHERE id=?', [name, categoryId, id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Error updating subcategory:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.delete('/api/subcategories/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM subcategories WHERE id=?', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting subcategory:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// 3. Get Projects (with Search & Pagination)
app.get('/api/projects', authenticateToken, async (req, res) => {
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (page - 1) * limit;

    try {
        let query = 'SELECT * FROM projects WHERE 1=1';
        const params = [];

        if (req.user.role !== 'admin') {
            query += ' AND UserID = ?';
            params.push(req.user.id);
        }

        if (search) {
            query += ' AND (ProjectName LIKE ? OR Description LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        query += ' ORDER BY ProjectStartDate DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [rows] = await pool.query(query, params);

        // Get Total Count for pagination
        let countQuery = 'SELECT COUNT(*) as total FROM projects WHERE 1=1';
        const countParams = [];
        if (req.user.role !== 'admin') {
            countQuery += ' AND UserID = ?';
            countParams.push(req.user.id);
        }
        if (search) {
            countQuery += ' AND (ProjectName LIKE ? OR Description LIKE ?)';
            countParams.push(`%${search}%`, `%${search}%`);
        }
        const [countResult] = await pool.query(countQuery, countParams);

        res.json({ projects: rows, total: countResult[0].total, page, limit });
    } catch (err) {
        console.error('Error fetching projects:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/projects', authenticateToken, async (req, res) => {
    const { ProjectName, Description, ProjectStartDate } = req.body;
    try {
        const [result] = await pool.query('INSERT INTO projects (ProjectName, Description, ProjectStartDate, UserID) VALUES (?, ?, ?, ?)',
            [ProjectName, Description, ProjectStartDate || new Date(), req.user.id]);
        res.json({ success: true, id: result.insertId });
    } catch (err) {
        console.error('Error creating project:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.put('/api/projects/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { ProjectName, Description, ProjectStartDate } = req.body;
    try {
        // Ensure user owns project
        const [existing] = await pool.query('SELECT UserID FROM projects WHERE ProjectID = ?', [id]);
        if (existing.length === 0) return res.status(404).json({ error: 'Project not found' });
        if (req.user.role !== 'admin' && existing[0].UserID !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

        await pool.query('UPDATE projects SET ProjectName=?, Description=?, ProjectStartDate=? WHERE ProjectID=?',
            [ProjectName, Description, ProjectStartDate, id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Error updating project:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.delete('/api/projects/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        // Ensure user owns project
        const [existing] = await pool.query('SELECT UserID FROM projects WHERE ProjectID = ?', [id]);
        if (existing.length === 0) return res.status(404).json({ error: 'Project not found' });
        if (req.user.role !== 'admin' && existing[0].UserID !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

        await pool.query('DELETE FROM projects WHERE ProjectID=?', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting project:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// 4. Get Expenses (Pagination & Search)
app.get('/api/expenses', authenticateToken, async (req, res) => {
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (page - 1) * limit;

    try {
        let query = `
            SELECT e.*, c.name as category_name, p.ProjectName as project_name 
            FROM expenses e 
            LEFT JOIN categories c ON e.category_id = c.id 
            LEFT JOIN projects p ON e.project_id = p.ProjectID
            WHERE 1=1
        `;
        const params = [];

        // Add user filter if desired
        // if (req.user.role !== 'admin') {
        //    query += ' AND e.user_id = ?';
        //    params.push(req.user.id);
        // }

        if (search) {
            query += ' AND (e.remarks LIKE ? OR c.name LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        query += ' ORDER BY e.date DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [rows] = await pool.query(query, params);

        const formatted = rows.map(r => ({
            id: r.id,
            date: r.date,
            amount: Number(r.amount),
            remarks: r.remarks,
            categoryId: r.category_id,
            subcategoryId: r.subcategory_id,
            projectId: r.project_id
        }));

        // Get count
        let countQuery = 'SELECT COUNT(*) as total FROM expenses e LEFT JOIN categories c ON e.category_id = c.id WHERE 1=1';
        const countParams = [];
        if (search) {
            countQuery += ' AND (e.remarks LIKE ? OR c.name LIKE ?)';
            countParams.push(`%${search}%`, `%${search}%`);
        }
        const [countResult] = await pool.query(countQuery, countParams);

        res.json({ expenses: formatted, total: countResult[0].total, page, limit });
    } catch (err) {
        console.error('Error fetching expenses:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/expenses', authenticateToken, async (req, res) => {
    const { date, amount, remarks, categoryId, subcategoryId, projectId } = req.body;
    try {
        const [result] = await pool.query(
            'INSERT INTO expenses (date, amount, remarks, category_id, subcategory_id, project_id, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [date, amount, remarks, categoryId, subcategoryId || null, projectId || null, req.user.id]
        );
        res.json({ success: true, id: result.insertId });
    } catch (err) {
        console.error('Error creating expense:', err);
        res.status(500).json({ error: 'Database error: ' + err.message });
    }
});

app.put('/api/expenses/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { date, amount, remarks, categoryId, subcategoryId, projectId } = req.body;
    try {
        await pool.query(
            'UPDATE expenses SET date=?, amount=?, remarks=?, category_id=?, subcategory_id=?, project_id=? WHERE id=?',
            [date, amount, remarks, categoryId, subcategoryId || null, projectId || null, id]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('Error updating expense:', err);
        res.status(500).json({ error: 'Database error: ' + err.message });
    }
});

app.delete('/api/expenses/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM expenses WHERE id=?', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting expense:', err);
        res.status(500).json({ error: 'Database error: ' + err.message });
    }
});

// 5. Get Incomes (Pagination & Search)
app.get('/api/incomes', authenticateToken, async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    try {
        const [rows] = await pool.query('SELECT * FROM incomes ORDER BY date DESC LIMIT ? OFFSET ?', [parseInt(limit), parseInt(offset)]);
        const formatted = rows.map(r => ({
            id: r.id,
            date: r.date,
            amount: Number(r.amount),
            remarks: r.remarks,
            categoryId: r.category_id,
            subcategoryId: r.subcategory_id,
            projectId: r.project_id
        }));

        const [countResult] = await pool.query('SELECT COUNT(*) as total FROM incomes');

        res.json({ incomes: formatted, total: countResult[0].total, page, limit });
    } catch (err) {
        console.error('Error fetching incomes:', err);
        res.status(500).json({ error: 'Database error: ' + err.message });
    }
});

app.post('/api/incomes', authenticateToken, async (req, res) => {
    const { date, amount, remarks, categoryId, subcategoryId, projectId } = req.body;
    try {
        const [result] = await pool.query(
            'INSERT INTO incomes (date, amount, remarks, category_id, subcategory_id, project_id, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [date, amount, remarks, categoryId, subcategoryId || null, projectId || null, req.user.id]
        );
        res.json({ success: true, id: result.insertId });
    } catch (err) {
        console.error('Error creating income:', err);
        res.status(500).json({ error: 'Database error: ' + err.message });
    }
});

app.put('/api/incomes/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { date, amount, remarks, categoryId, subcategoryId, projectId } = req.body;
    try {
        await pool.query(
            'UPDATE incomes SET date=?, amount=?, remarks=?, category_id=?, subcategory_id=?, project_id=? WHERE id=?',
            [date, amount, remarks, categoryId, subcategoryId || null, projectId || null, id]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('Error updating income:', err);
        res.status(500).json({ error: 'Database error: ' + err.message });
    }
});

app.delete('/api/incomes/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM incomes WHERE id=?', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting income:', err);
        res.status(500).json({ error: 'Database error: ' + err.message });
    }
});

// 6. Users
app.get('/api/users', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
    }
    try {
        const [rows] = await pool.query('SELECT id, name, email, role, created_at FROM users');
        res.json({ users: rows });
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// 7. Analytics
// Dashboard Stats
app.get('/api/dashboard-stats', authenticateToken, async (req, res) => {
    try {
        const [expenseRows] = await pool.query('SELECT amount, date FROM expenses');
        const [incomeRows] = await pool.query('SELECT amount, date FROM incomes');

        const totalExpenses = expenseRows.reduce((sum, item) => sum + Number(item.amount), 0);
        const totalIncomes = incomeRows.reduce((sum, item) => sum + Number(item.amount), 0);

        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
        const monthlyExpenses = expenseRows
            .filter(e => new Date(e.date).toISOString().startsWith(currentMonth))
            .reduce((sum, item) => sum + Number(item.amount), 0);
        const monthlyIncomes = incomeRows
            .filter(i => new Date(i.date).toISOString().startsWith(currentMonth))
            .reduce((sum, item) => sum + Number(item.amount), 0);

        res.json({
            totalExpenses,
            totalIncomes,
            balance: totalIncomes - totalExpenses,
            monthlyBalance: monthlyIncomes - monthlyExpenses,
            expenseCount: expenseRows.length,
            incomeCount: incomeRows.length
        });
    } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Category Breakdown
app.get('/api/category-breakdown', authenticateToken, async (req, res) => {
    const { type } = req.query; // 'expense' or 'income'
    const table = type === 'income' ? 'incomes' : 'expenses';
    try {
        const [rows] = await pool.query(`
            SELECT c.name as categoryName, SUM(t.amount) as total
            FROM ${table} t
            JOIN categories c ON t.category_id = c.id
            GROUP BY c.name
        `);
        res.json({ breakdown: rows });
    } catch (err) {
        console.error('Error fetching category breakdown:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Monthly Trends
app.get('/api/monthly-trends', authenticateToken, async (req, res) => {
    try {
        const [expenseRows] = await pool.query(`
            SELECT DATE_FORMAT(date, '%b') as month, SUM(amount) as total
            FROM expenses
            WHERE date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
            GROUP BY DATE_FORMAT(date, '%b'), YEAR(date), MONTH(date)
            ORDER BY YEAR(date), MONTH(date)
        `);

        const [incomeRows] = await pool.query(`
            SELECT DATE_FORMAT(date, '%b') as month, SUM(amount) as total
            FROM incomes
            WHERE date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
            GROUP BY DATE_FORMAT(date, '%b'), YEAR(date), MONTH(date)
            ORDER BY YEAR(date), MONTH(date)
        `);

        // Generate last 6 months list to ensure continuity
        const trends = [];
        const today = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const monthStr = d.toLocaleString('default', { month: 'short' });

            const expense = expenseRows.find(r => r.month === monthStr);
            const income = incomeRows.find(r => r.month === monthStr);

            trends.push({
                month: monthStr,
                expenses: expense ? Number(expense.total) : 0,
                incomes: income ? Number(income.total) : 0
            });
        }

        res.json({ trends });
    } catch (err) {
        console.error('Error fetching monthly trends:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Project Breakdown
app.get('/api/project-breakdown', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT p.ProjectName as name, SUM(e.amount) as total
            FROM expenses e
            JOIN projects p ON e.project_id = p.ProjectID
            GROUP BY p.ProjectName
        `);
        res.json({ breakdown: rows });
    } catch (err) {
        console.error('Error fetching project breakdown:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Error handling middleware (Week 10)
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!', details: err.message });
});

// Profile Update
app.put('/api/users/profile', authenticateToken, async (req, res) => {
    const { name, email } = req.body;
    if (!name || !email) {
        return res.status(400).json({ error: 'Name and email are required' });
    }
    try {
        await pool.query('UPDATE users SET name = ?, email = ? WHERE id = ?', [name, email, req.user.id]);
        res.json({ success: true, user: { id: req.user.id, name, email } });
    } catch (err) {
        console.error('Error updating profile:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Password Update
app.put('/api/users/password', authenticateToken, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current and new password are required' });
    }
    try {
        const [rows] = await pool.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'User not found' });

        const valid = await bcrypt.compare(currentPassword, rows[0].password);
        if (!valid) return res.status(400).json({ error: 'Incorrect current password' });

        const hashed = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashed, req.user.id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Error updating password:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
