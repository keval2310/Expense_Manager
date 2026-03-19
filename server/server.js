const express = require("express");
const path = require("path");
require("dotenv").config();
const cors = require("cors");
const mysql = require("mysql2/promise");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const fs = require("fs");
const http = require("http");
const { Server } = require("socket.io");
const webpush = require("web-push");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"; // Change in production

// Web Push VAPID Keys
const publicVapidKey = "BFsKG2-HrVqRc1y79LWRZVGj9UGxUjukqUwBMFNd2aQhBC44tGp8ejkjOw-nybfddDmYUa5mcqGWRRy0Ntefz-I";
const privateVapidKey = "27AqwAd3zqSS0cKNu9kCOX3DBKxeWY_a_IXS0_08lwo";

webpush.setVapidDetails(
  "mailto:keval192837@gmail.com",
  publicVapidKey,
  privateVapidKey
);

// Socket.io Connection
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);
  
  socket.on("join", (role) => {
    if (role === "super_admin") {
      socket.join("super_admins");
      console.log("Socket joined super_admins room");
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

// Activity Logging Helper
const logActivity = async (userId, action, details, req) => {
  try {
    const ip = req ? req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress : "unknown";
    await pool.query(
      "INSERT INTO activity_logs (user_id, action, details, ip_address, is_read) VALUES (?, ?, ?, ?, ?)",
      [userId, action, details, ip, false]
    );

    // Get user info for notification
    const [users] = await pool.query("SELECT name, role FROM users WHERE id = ?", [userId]);
    const userName = users[0] ? users[0].name : "Unknown User";
    const userRole = users[0] ? users[0].role : "user";

    // ONLY notify if actor is NOT super admin AND action is NOT 'LOGIN' or 'REGISTER'
    if (userRole && userRole.toLowerCase() !== "super_admin" && action !== 'LOGIN' && action !== 'REGISTER') {
      const logEntry = {
        userName,
        userRole,
        action,
        details,
        created_at: new Date(),
      };

      // Real-time notification to Super Admins via Socket.io
      io.to("super_admins").emit("activity_notification", logEntry);

      // Browser Push Notification to Super Admins
      const [subs] = await pool.query(
        "SELECT s.subscription FROM push_subscriptions s JOIN users u ON s.user_id = u.id WHERE u.role = 'super_admin'"
      );

      const payload = JSON.stringify({
        title: "System Alert",
        body: `${userName} (${userRole}): ${action} - ${details}`,
        icon: "http://localhost:5173/logo.png",
        badge: "http://localhost:5173/logo.png",
        vibrate: [200, 100, 200, 100, 200],
        tag: "expense-manager-activity",
        renotify: true,
        data: {
          url: "/dashboard",
        },
      });

      // Use a Map to deduplicate by endpoint so users only get 1 notification per device
      const uniqueSubs = new Map();
      subs.forEach(row => {
        const s = typeof row.subscription === 'string' ? JSON.parse(row.subscription) : row.subscription;
        if (s.endpoint) uniqueSubs.set(s.endpoint, s);
      });

      uniqueSubs.forEach((subscription) => {
        webpush.sendNotification(subscription, payload).catch((err) => {
          // 410 = unsubscribed, 404 = not found, 400 = bad request (stale endpoint)
          // These are all "expired subscription" errors — clean up silently
          if (err.statusCode === 410 || err.statusCode === 404 || err.statusCode === 400) {
            pool.query(
              "DELETE FROM push_subscriptions WHERE subscription->>'$.endpoint' = ?",
              [subscription.endpoint]
            ).catch(() => {});
          } else {
            console.error("Push notification error (unexpected):", err.statusCode, err.message);
          }
        });
      });
    }

  } catch (err) {
    console.error("Error logging activity:", err);
  }
};

// Create uploads directory if not exists
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage: storage });

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(uploadDir)); // Serve uploaded files

// Database connection config
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "expense_manager",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// Create a connection pool
const pool = mysql.createPool(dbConfig);

// Test connection
pool
  .getConnection()
  .then((connection) => {
    console.log("Connected to MySQL database!");
    connection.release();
  })
  .catch((err) => {
    console.error("Error connecting to MySQL:", err);
  });

// Middleware: Verify JWT Token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, async (err, user) => {
    if (err) return res.sendStatus(403);
    
    try {
      // Always get latest role from DB to avoid issues with stale tokens
      const [users] = await pool.query("SELECT id, name, email, role FROM users WHERE id = ?", [user.id]);
      if (users.length === 0) return res.sendStatus(401);
      
      req.user = users[0];
      next();
    } catch (dbErr) {
      console.error("Auth DB Error:", dbErr);
      res.sendStatus(500);
    }
  });
};

// Middleware: Require Admin Role
const requireAdmin = (req, res, next) => {
  if (req.user && (req.user.role === "admin" || req.user.role === "super_admin")) {
    next();
  } else {
    res.status(403).json({ error: "Access denied. Admin or Super Admin role required." });
  }
};

// Middleware: Require Super Admin Role
const requireSuperAdmin = (req, res, next) => {
  if (req.user && req.user.role === "super_admin") {
    next();
  } else {
    res.status(403).json({ error: "Access denied. Super Admin role required." });
  }
};

// API Routes

// --- Authentication ---

// Register
app.post("/api/auth/register", async (req, res) => {
  const { name, email, password, role } = req.body;
  try {
    // Check if user exists
    const [existing] = await pool.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    if (existing.length > 0) {
      return res.status(400).json({ error: "Email already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Force role to 'user' for public registration to prevent self-elevation to 'admin'
    const finalRole = 'user';

    // Insert user
    const [result] = await pool.query(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
      [name, email, hashedPassword, finalRole],
    );

    const userId = result.insertId;
    const token = jwt.sign(
      { id: userId, email, role: finalRole },
      JWT_SECRET,
      { expiresIn: "24h" },
    );

    res.json({
      success: true,
      token,
      user: { id: userId, name, email, role: finalRole },
    });

    logActivity(userId, "REGISTER", `New user registered: ${name} (${email})`, req);
  } catch (err) {
    console.error("Error registering user:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

// Login
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const [users] = await pool.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    if (users.length === 0) {
      return res.status(400).json({ error: "User not found" });
    }

    const user = users[0];
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: "Invalid password" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "24h" },
    );
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

    logActivity(user.id, "LOGIN", `User logged in`, req);
  } catch (err) {
    console.error("Error logging in:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

// Get Current User
app.get("/api/auth/me", authenticateToken, async (req, res) => {
  try {
    const [users] = await pool.query(
      "SELECT id, name, email, role FROM users WHERE id = ?",
      [req.user.id],
    );
    if (users.length === 0)
      return res.status(404).json({ error: "User not found" });
    res.json({ user: users[0] });
  } catch (err) {
    console.error("Error fetching current user:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// --- File Upload ---
app.post(
  "/api/upload",
  authenticateToken,
  upload.single("file"),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ success: true, fileUrl });
  },
);

// --- Core Features ---

// 1. Get Categories
app.get("/api/categories", authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM categories");
    res.json({ categories: rows });
  } catch (err) {
    console.error("Error fetching categories:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// Create Category (Admin Only)
app.post("/api/categories", authenticateToken, requireAdmin, async (req, res) => {
  const { name, type } = req.body;
  try {
    const [result] = await pool.query(
      "INSERT INTO categories (name, type) VALUES (?, ?)",
      [name, type],
    );
    res.json({ success: true, id: result.insertId });
    logActivity(req.user.id, "CREATE_CATEGORY", `Created category: ${name} (${type})`, req);
  } catch (err) {
    console.error("Error creating category:", err);
    res.status(500).json({ error: "Database error" });
  }
});

app.put("/api/categories/:id", authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, type } = req.body;
  try {
    await pool.query("UPDATE categories SET name=?, type=? WHERE id=?", [
      name,
      type,
      id,
    ]);
    res.json({ success: true });
    logActivity(req.user.id, "UPDATE_CATEGORY", `Updated category ID: ${id} to ${name} (${type})`, req);
  } catch (err) {
    console.error("Error updating category:", err);
    res.status(500).json({ error: "Database error" });
  }
});

app.delete("/api/categories/:id", authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM categories WHERE id=?", [id]);
    res.json({ success: true });
    logActivity(req.user.id, "DELETE_CATEGORY", `Deleted category ID: ${id}`, req);
  } catch (err) {
    console.error("Error deleting category:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// 2. Get Subcategories
app.get("/api/subcategories", authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM subcategories");
    const formatted = rows.map((r) => ({
      id: r.id,
      name: r.name,
      categoryId: r.category_id,
    }));
    res.json({ subcategories: formatted });
  } catch (err) {
    console.error("Error fetching subcategories:", err);
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/api/subcategories", authenticateToken, requireAdmin, async (req, res) => {
  const { name, categoryId } = req.body;
  try {
    const [result] = await pool.query(
      "INSERT INTO subcategories (name, category_id) VALUES (?, ?)",
      [name, categoryId],
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    console.error("Error creating subcategory:", err);
    res.status(500).json({ error: "Database error" });
  }
});

app.put("/api/subcategories/:id", authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, categoryId } = req.body;
  try {
    await pool.query(
      "UPDATE subcategories SET name=?, category_id=? WHERE id=?",
      [name, categoryId, id],
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Error updating subcategory:", err);
    res.status(500).json({ error: "Database error" });
  }
});

app.delete("/api/subcategories/:id", authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM subcategories WHERE id=?", [id]);
    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting subcategory:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// 3. Get Projects (with Search & Pagination)
app.get("/api/projects", authenticateToken, async (req, res) => {
  const { page = 1, limit = 10, search = "" } = req.query;
  const offset = (page - 1) * limit;

  try {
    let query = `
      SELECT p.*, u.name as user_name
      FROM projects p
      JOIN users u ON p.UserID = u.id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role !== "admin" && req.user.role !== "super_admin") {
      query += " AND p.UserID = ?";
      params.push(req.user.id);
    }

    if (search) {
      query += " AND (p.ProjectName LIKE ? OR p.Description LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    query += " ORDER BY p.ProjectStartDate DESC LIMIT ? OFFSET ?";
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await pool.query(query, params);

    // Get Total Count for pagination
    let countQuery = "SELECT COUNT(*) as total FROM projects WHERE 1=1";
    const countParams = [];
    if (req.user.role !== "admin" && req.user.role !== "super_admin") {
      countQuery += " AND UserID = ?";
      countParams.push(req.user.id);
    }
    if (search) {
      countQuery += " AND (ProjectName LIKE ? OR Description LIKE ?)";
      countParams.push(`%${search}%`, `%${search}%`);
    }
    const [countResult] = await pool.query(countQuery, countParams);

    res.json({ projects: rows, total: countResult[0].total, page, limit });
  } catch (err) {
    console.error("Error fetching projects:", err);
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/api/projects", authenticateToken, async (req, res) => {
  const { ProjectName, ProjectDetail, Description, ProjectStartDate, ProjectEndDate, ProjectLogo } = req.body;
  try {
    const [result] = await pool.query(
      "INSERT INTO projects (ProjectName, ProjectDetail, Description, ProjectStartDate, ProjectEndDate, ProjectLogo, UserID) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        ProjectName, 
        ProjectDetail || null, 
        Description || null, 
        ProjectStartDate || new Date(), 
        ProjectEndDate || null,
        ProjectLogo || null,
        req.user.id
      ],
    );
    res.json({ success: true, id: result.insertId });
    logActivity(req.user.id, "CREATE_PROJECT", `Created project: ${ProjectName}`, req);
  } catch (err) {
    console.error("Error creating project:", err);
    res.status(500).json({ error: "Database error" });
  }
});

app.put("/api/projects/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { ProjectName, ProjectDetail, Description, ProjectStartDate, ProjectEndDate, ProjectLogo, IsActive } = req.body;
  try {
    const [existing] = await pool.query(
      "SELECT UserID FROM projects WHERE ProjectID = ?",
      [id],
    );
    if (existing.length === 0)
      return res.status(404).json({ error: "Project not found" });
    if (req.user.role !== "admin" && req.user.role !== "super_admin" && existing[0].UserID !== req.user.id)
      return res.status(403).json({ error: "Not authorized" });

    await pool.query(
      "UPDATE projects SET ProjectName=?, ProjectDetail=?, Description=?, ProjectStartDate=?, ProjectEndDate=?, ProjectLogo=?, IsActive=? WHERE ProjectID=?",
      [
        ProjectName, 
        ProjectDetail || null,
        Description || null,
        ProjectStartDate, 
        ProjectEndDate || null,
        ProjectLogo || null,
        IsActive ?? true,
        id
      ],
    );
    res.json({ success: true });
    logActivity(req.user.id, "UPDATE_PROJECT", `Updated project: ${ProjectName} (ID: ${id})`, req);
  } catch (err) {
    console.error("Error updating project:", err);
    res.status(500).json({ error: "Database error" });
  }
});

app.delete("/api/projects/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    // Ensure user owns project
    const [existing] = await pool.query(
      "SELECT UserID FROM projects WHERE ProjectID = ?",
      [id],
    );
    if (existing.length === 0)
      return res.status(404).json({ error: "Project not found" });
    if (req.user.role !== "admin" && req.user.role !== "super_admin" && existing[0].UserID !== req.user.id)
      return res.status(403).json({ error: "Not authorized" });

    await pool.query("DELETE FROM projects WHERE ProjectID=?", [id]);
    res.json({ success: true });
    logActivity(req.user.id, "DELETE_PROJECT", `Deleted project ID: ${id}`, req);
  } catch (err) {
    console.error("Error deleting project:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// 4. Get Expenses (Pagination & Search)
app.get("/api/expenses", authenticateToken, async (req, res) => {
  const { page = 1, limit = 10, search = "" } = req.query;
  const offset = (page - 1) * limit;

  try {
    let query = `
            SELECT e.*, c.name as category_name, p.ProjectName as project_name, u.name as user_name
            FROM expenses e 
            LEFT JOIN categories c ON e.category_id = c.id 
            LEFT JOIN projects p ON e.project_id = p.ProjectID
            JOIN users u ON e.user_id = u.id
            WHERE 1=1
        `;
    const params = [];

    // Add user filter
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      query += ' AND e.user_id = ?';
      params.push(req.user.id);
    }

    if (search) {
      query += " AND (e.remarks LIKE ? OR c.name LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    query += " ORDER BY e.date DESC LIMIT ? OFFSET ?";
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await pool.query(query, params);

    const formatted = rows.map((r) => ({
      id: r.id,
      date: r.date,
      amount: Number(r.amount),
      remarks: r.remarks,
      categoryId: r.category_id,
      subcategoryId: r.subcategory_id,
      projectId: r.project_id,
      userName: r.user_name,
      userId: r.user_id
    }));

    // Get count
    let countQuery =
      "SELECT COUNT(*) as total FROM expenses e LEFT JOIN categories c ON e.category_id = c.id WHERE 1=1";
    const countParams = [];

    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      countQuery += ' AND e.user_id = ?';
      countParams.push(req.user.id);
    }

    if (search) {
      countQuery += " AND (e.remarks LIKE ? OR c.name LIKE ?)";
      countParams.push(`%${search}%`, `%${search}%`);
    }
    const [countResult] = await pool.query(countQuery, countParams);

    res.json({ expenses: formatted, total: countResult[0].total, page, limit });
  } catch (err) {
    console.error("Error fetching expenses:", err);
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/api/expenses", authenticateToken, async (req, res) => {
  const { date, amount, remarks, categoryId, subcategoryId, projectId } =
    req.body;
  try {
    const [result] = await pool.query(
      "INSERT INTO expenses (date, amount, remarks, category_id, subcategory_id, project_id, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        date,
        amount,
        remarks,
        categoryId,
        subcategoryId || null,
        projectId || null,
        req.user.id,
      ],
    );
    res.json({ success: true, id: result.insertId });
    logActivity(req.user.id, "CREATE_EXPENSE", `Added expense of ₹${amount}${remarks ? ` — ${remarks}` : ''}`, req);
  } catch (err) {
    console.error("Error creating expense:", err);
    res.status(500).json({ error: "Database error: " + err.message });
  }
});

app.put("/api/expenses/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { date, amount, remarks, categoryId, subcategoryId, projectId } =
    req.body;
  try {
    // Check ownership
    const [existing] = await pool.query("SELECT user_id FROM expenses WHERE id=?", [id]);
    if (existing.length === 0) return res.status(404).json({ error: "Expense not found" });

    if (req.user.role !== "admin" && req.user.role !== "super_admin" && existing[0].user_id !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    await pool.query(
      "UPDATE expenses SET date=?, amount=?, remarks=?, category_id=?, subcategory_id=?, project_id=? WHERE id=?",
      [
        date,
        amount,
        remarks,
        categoryId,
        subcategoryId || null,
        projectId || null,
        id,
      ],
    );
    res.json({ success: true });
    logActivity(req.user.id, "UPDATE_EXPENSE", `Updated expense: ${amount} (ID: ${id})`, req);
  } catch (err) {
    console.error("Error updating expense:", err);
    res.status(500).json({ error: "Database error: " + err.message });
  }
});

app.delete("/api/expenses/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    // Check ownership
    const [existing] = await pool.query("SELECT user_id FROM expenses WHERE id=?", [id]);
    if (existing.length === 0) return res.status(404).json({ error: "Expense not found" });

    if (req.user.role !== "admin" && req.user.role !== "super_admin" && existing[0].user_id !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    await pool.query("DELETE FROM expenses WHERE id=?", [id]);
    res.json({ success: true });
    logActivity(req.user.id, "DELETE_EXPENSE", `Deleted expense ID: ${id}`, req);
  } catch (err) {
    console.error("Error deleting expense:", err);
    res.status(500).json({ error: "Database error: " + err.message });
  }
});

// 5. Get Incomes (Pagination & Search)
app.get("/api/incomes", authenticateToken, async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;

  try {
    let query = `
      SELECT i.*, u.name as user_name
      FROM incomes i
      JOIN users u ON i.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      query += " AND i.user_id = ?";
      params.push(req.user.id);
    }

    query += " ORDER BY i.date DESC LIMIT ? OFFSET ?";
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await pool.query(query, params);
    const formatted = rows.map((r) => ({
      id: r.id,
      date: r.date,
      amount: Number(r.amount),
      remarks: r.remarks,
      categoryId: r.category_id,
      subcategoryId: r.subcategory_id,
      projectId: r.project_id,
      userName: r.user_name,
      userId: r.user_id
    }));

    let countQuery = "SELECT COUNT(*) as total FROM incomes WHERE 1=1";
    const countParams = [];

    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      countQuery += " AND user_id = ?";
      countParams.push(req.user.id);
    }

    const [countResult] = await pool.query(countQuery, countParams);

    res.json({ incomes: formatted, total: countResult[0].total, page, limit });
  } catch (err) {
    console.error("Error fetching incomes:", err);
    res.status(500).json({ error: "Database error: " + err.message });
  }
});

app.post("/api/incomes", authenticateToken, async (req, res) => {
  const { date, amount, remarks, categoryId, subcategoryId, projectId } =
    req.body;
  try {
    const [result] = await pool.query(
      "INSERT INTO incomes (date, amount, remarks, category_id, subcategory_id, project_id, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        date,
        amount,
        remarks,
        categoryId,
        subcategoryId || null,
        projectId || null,
        req.user.id,
      ],
    );
    res.json({ success: true, id: result.insertId });
    logActivity(req.user.id, "CREATE_INCOME", `Added income of ₹${amount}${remarks ? ` — ${remarks}` : ''}`, req);
  } catch (err) {
    console.error("Error creating income:", err);
    res.status(500).json({ error: "Database error: " + err.message });
  }
});

app.put("/api/incomes/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { date, amount, remarks, categoryId, subcategoryId, projectId } =
    req.body;
  try {
    // Check ownership
    const [existing] = await pool.query("SELECT user_id FROM incomes WHERE id=?", [id]);
    if (existing.length === 0) return res.status(404).json({ error: "Income not found" });

    if (req.user.role !== "admin" && req.user.role !== "super_admin" && existing[0].user_id !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    await pool.query(
      "UPDATE incomes SET date=?, amount=?, remarks=?, category_id=?, subcategory_id=?, project_id=? WHERE id=?",
      [
        date,
        amount,
        remarks,
        categoryId,
        subcategoryId || null,
        projectId || null,
        id,
      ],
    );
    res.json({ success: true });
    logActivity(req.user.id, "UPDATE_INCOME", `Updated income: ${amount} (ID: ${id})`, req);
  } catch (err) {
    console.error("Error updating income:", err);
    res.status(500).json({ error: "Database error: " + err.message });
  }
});

app.delete("/api/incomes/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    // Check ownership
    const [existing] = await pool.query("SELECT user_id FROM incomes WHERE id=?", [id]);
    if (existing.length === 0) return res.status(404).json({ error: "Income not found" });

    if (req.user.role !== "admin" && req.user.role !== "super_admin" && existing[0].user_id !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    await pool.query("DELETE FROM incomes WHERE id=?", [id]);
    res.json({ success: true });
    logActivity(req.user.id, "DELETE_INCOME", `Deleted income ID: ${id}`, req);
  } catch (err) {
    console.error("Error deleting income:", err);
    res.status(500).json({ error: "Database error: " + err.message });
  }
});

// 6. Users
app.get("/api/users", authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, name, email, role, created_at FROM users",
    );
    res.json({ users: rows });
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// Logout Route
app.post("/api/auth/logout", authenticateToken, async (req, res) => {
  try {
    await logActivity(req.user.id, "LOGOUT", "User logged out of the system", req);
    res.json({ success: true, message: "Logged out successfully" });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({ error: "Logout failed" });
  }
});

// Update User (Admin Only)
app.put("/api/users/:id", authenticateToken, requireSuperAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, email, role } = req.body;
  try {
    await pool.query(
      "UPDATE users SET name = ?, email = ?, role = ? WHERE id = ?",
      [name, email, role, id]
    );
    res.json({ success: true });
    logActivity(req.user.id, "UPDATE_USER", `Updated user: ${name} (ID: ${id}) role to ${role}`, req);
  } catch (err) {
    console.error("Error updating user:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// Delete User (Super Admin Only)
app.delete("/api/users/:id", authenticateToken, requireSuperAdmin, async (req, res) => {
  const { id } = req.params;
  const connection = await pool.getConnection();
  try {
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: "Cannot delete yourself" });
    }

    await connection.beginTransaction();

    // Disable foreign key checks to ensure deletion
    await connection.query("SET FOREIGN_KEY_CHECKS = 0");

    // Clean up all data associated with this user
    await connection.query("DELETE FROM push_subscriptions WHERE user_id = ?", [id]);
    await connection.query("DELETE FROM activity_logs WHERE user_id = ?", [id]);
    await connection.query("DELETE FROM expenses WHERE user_id = ?", [id]);
    await connection.query("DELETE FROM incomes WHERE user_id = ?", [id]);
    await connection.query("DELETE FROM projects WHERE UserID = ?", [id]);
    
    // Finally delete the user
    await connection.query("DELETE FROM users WHERE id = ?", [id]);

    // Re-enable foreign key checks
    await connection.query("SET FOREIGN_KEY_CHECKS = 1");

    await connection.commit();
    res.json({ success: true, message: "User and all associated data deleted successfully" });
    
    logActivity(req.user.id, "DELETE_USER", `Deleted user ID: ${id}`, req);
  } catch (err) {
    if (connection) {
      await connection.query("SET FOREIGN_KEY_CHECKS = 1");
      await connection.rollback();
    }
    console.error("Error deleting user:", err);
    res.status(500).json({ error: "Failed to delete user: " + err.message });
  } finally {
    connection.release();
  }
});

// 7. Analytics
// Dashboard Stats
app.get("/api/dashboard-stats", authenticateToken, async (req, res) => {
  try {
    let expenseQuery = "SELECT amount, date FROM expenses WHERE 1=1";
    let incomeQuery = "SELECT amount, date FROM incomes WHERE 1=1";
    const params = [];

    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      expenseQuery += " AND user_id = ?";
      incomeQuery += " AND user_id = ?";
      params.push(req.user.id);
    }

    const [expenseRows] = await pool.query(expenseQuery, params);
    const [incomeRows] = await pool.query(incomeQuery, params);

    const totalExpenses = expenseRows.reduce(
      (sum, item) => sum + Number(item.amount),
      0,
    );
    const totalIncomes = incomeRows.reduce(
      (sum, item) => sum + Number(item.amount),
      0,
    );

    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const monthlyExpenses = expenseRows
      .filter((e) => new Date(e.date).toISOString().startsWith(currentMonth))
      .reduce((sum, item) => sum + Number(item.amount), 0);
    const monthlyIncomes = incomeRows
      .filter((i) => new Date(i.date).toISOString().startsWith(currentMonth))
      .reduce((sum, item) => sum + Number(item.amount), 0);

    res.json({
      totalExpenses,
      totalIncomes,
      balance: totalIncomes - totalExpenses,
      monthlyBalance: monthlyIncomes - monthlyExpenses,
      expenseCount: expenseRows.length,
      incomeCount: incomeRows.length,
    });
  } catch (err) {
    console.error("Error fetching dashboard stats:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// Category Breakdown
app.get("/api/category-breakdown", authenticateToken, async (req, res) => {
  const { type } = req.query; // 'expense' or 'income'
  const table = type === "income" ? "incomes" : "expenses";
  try {
    let query = `
            SELECT c.name as categoryName, SUM(t.amount) as total
            FROM ${table} t
            JOIN categories c ON t.category_id = c.id
            WHERE 1=1
    `;
    const params = [];

    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      query += " AND t.user_id = ?";
      params.push(req.user.id);
    }

    query += " GROUP BY c.name";

    const [rows] = await pool.query(query, params);
    res.json({ breakdown: rows });
  } catch (err) {
    console.error("Error fetching category breakdown:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// Monthly Trends
app.get("/api/monthly-trends", authenticateToken, async (req, res) => {
  try {
    let expenseQuery = `
            SELECT DATE_FORMAT(date, '%b') as month, SUM(amount) as total
            FROM expenses
            WHERE date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
    `;
    let incomeQuery = `
            SELECT DATE_FORMAT(date, '%b') as month, SUM(amount) as total
            FROM incomes
            WHERE date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
    `;
    const params = [];

    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      expenseQuery += " AND user_id = ?";
      incomeQuery += " AND user_id = ?";
      params.push(req.user.id);
    }

    expenseQuery += " GROUP BY DATE_FORMAT(date, '%b'), YEAR(date), MONTH(date) ORDER BY YEAR(date), MONTH(date)";
    incomeQuery += " GROUP BY DATE_FORMAT(date, '%b'), YEAR(date), MONTH(date) ORDER BY YEAR(date), MONTH(date)";

    const [expenseRows] = await pool.query(expenseQuery, params);
    const [incomeRows] = await pool.query(incomeQuery, params);

    // Generate last 6 months list to ensure continuity
    const trends = [];
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthStr = d.toLocaleString("default", { month: "short" });

      const expense = expenseRows.find((r) => r.month === monthStr);
      const income = incomeRows.find((r) => r.month === monthStr);

      trends.push({
        month: monthStr,
        expenses: expense ? Number(expense.total) : 0,
        incomes: income ? Number(income.total) : 0,
      });
    }

    res.json({ trends });
  } catch (err) {
    console.error("Error fetching monthly trends:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// Project Breakdown
app.get("/api/project-breakdown", authenticateToken, async (req, res) => {
  try {
    let pQuery = "SELECT * FROM projects";
    let eQuery = "SELECT project_id, amount FROM expenses WHERE project_id IS NOT NULL";
    let iQuery = "SELECT project_id, amount FROM incomes WHERE project_id IS NOT NULL";
    
    let pParams = [];
    let eParams = [];
    let iParams = [];

    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      pQuery += " WHERE UserID = ?";
      pParams.push(req.user.id);
      
      eQuery += " AND user_id = ?";
      eParams.push(req.user.id);
      
      iQuery += " AND user_id = ?";
      iParams.push(req.user.id);
    }

    const [projects] = await pool.query(pQuery, pParams);
    const [expenses] = await pool.query(eQuery, eParams);
    const [incomes] = await pool.query(iQuery, iParams);

    const breakdown = projects.map(p => {
      const pExpenses = expenses.filter(e => e.project_id === p.ProjectID);
      const pIncomes = incomes.filter(i => i.project_id === p.ProjectID);
      
      const totalExpenses = pExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
      const totalIncomes = pIncomes.reduce((sum, i) => sum + Number(i.amount), 0);

      return {
        projectId: p.ProjectID,
        projectName: p.ProjectName,
        totalExpenses,
        totalIncomes,
        balance: totalIncomes - totalExpenses,
        expenseCount: pExpenses.length,
        incomeCount: pIncomes.length
      };
    }).filter(p => p.expenseCount > 0 || p.incomeCount > 0 || req.user.role === 'admin' || req.user.role === 'super_admin');

    res.json({ breakdown });
  } catch (err) {
    console.error("Error fetching project breakdown:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// Error handling middleware (Week 10)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res
    .status(500)
    .json({ error: "Something went wrong!", details: err.message });
});

// Profile Update
app.put("/api/users/profile", authenticateToken, async (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: "Name and email are required" });
  }
  try {
    await pool.query("UPDATE users SET name = ?, email = ? WHERE id = ?", [
      name,
      email,
      req.user.id,
    ]);
    res.json({ success: true, user: { id: req.user.id, name, email } });
  } catch (err) {
    console.error("Error updating profile:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// Password Update
app.put("/api/users/password", authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res
      .status(400)
      .json({ error: "Current and new password are required" });
  }
  try {
    const [rows] = await pool.query("SELECT password FROM users WHERE id = ?", [
      req.user.id,
    ]);
    if (rows.length === 0)
      return res.status(404).json({ error: "User not found" });

    const valid = await bcrypt.compare(currentPassword, rows[0].password);
    if (!valid)
      return res.status(400).json({ error: "Incorrect current password" });

    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query("UPDATE users SET password = ? WHERE id = ?", [
      hashed,
      req.user.id,
    ]);
    res.json({ success: true });
  } catch (err) {
    console.error("Error updating password:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// --- Activity & Notifications (New) ---

// Get Activity Logs (Super Admin Only)
app.get("/api/activity-logs", authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT l.*, u.name as user_name, u.role as user_role 
      FROM activity_logs l 
      JOIN users u ON l.user_id = u.id 
      WHERE LOWER(u.role) != 'super_admin'
      ORDER BY l.created_at DESC 
      LIMIT 100
    `);
    res.json({ logs: rows });
  } catch (err) {
    console.error("Error fetching activity logs:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// Mark Single Notification as Read
app.put("/api/activity-logs/:id/read", authenticateToken, requireSuperAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("UPDATE activity_logs SET is_read = TRUE WHERE id = ?", [id]);
    res.json({ success: true });
  } catch (err) {
    console.error("Error marking log as read:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// Mark All Notifications as Read
app.put("/api/activity-logs/read-all", authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    await pool.query("UPDATE activity_logs SET is_read = TRUE WHERE is_read = FALSE");
    res.json({ success: true });
  } catch (err) {
    console.error("Error marking all logs as read:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// Subscribe to Web Push Notifications
app.post("/api/notifications/subscribe", authenticateToken, async (req, res) => {
  const subscription = req.body;
  try {
    // Check specifically for the endpoint key to avoid duplicates
    const [existing] = await pool.query(
      "SELECT id FROM push_subscriptions WHERE user_id = ? AND subscription->'$.endpoint' = ?",
      [req.user.id, subscription.endpoint]
    );

    if (existing.length === 0) {
      await pool.query(
        "INSERT INTO push_subscriptions (user_id, subscription) VALUES (?, ?)",
        [req.user.id, JSON.stringify(subscription)]
      );
    }
    res.status(201).json({ success: true });
  } catch (err) {
    console.error("Error subscribing to notifications:", err);
    res.status(500).json({ error: "Database error" });
  }
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
