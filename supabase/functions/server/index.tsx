import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// Create Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
);

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Auth middleware
async function requireAuth(c: any, next: any) {
  const accessToken = c.req.header('Authorization')?.split(' ')[1];
  if (!accessToken) {
    return c.json({ error: 'Unauthorized - No token provided' }, 401);
  }

  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  if (error || !user) {
    return c.json({ error: 'Unauthorized - Invalid token' }, 401);
  }

  c.set('user', user);
  await next();
}

// Health check endpoint
app.get("/make-server-e150488f/health", (c) => {
  return c.json({ status: "ok" });
});

// ==================== AUTH ROUTES ====================

// Signup
app.post("/make-server-e150488f/auth/signup", async (c) => {
  try {
    const { email, password, name, role } = await c.req.json();

    // Create user with Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name, role: role || 'user' },
      email_confirm: true, // Auto-confirm since email server hasn't been configured
    });

    if (error) {
      console.error('Signup error:', error);
      return c.json({ error: error.message }, 400);
    }

    // Store user profile in KV store
    await kv.set(`user:${data.user.id}`, {
      id: data.user.id,
      email: data.user.email,
      name,
      role: role || 'user',
      createdAt: new Date().toISOString(),
    });

    return c.json({ user: data.user });
  } catch (error) {
    console.error('Signup error:', error);
    return c.json({ error: 'Internal server error during signup' }, 500);
  }
});

// ==================== USER ROUTES ====================

// Get current user profile
app.get("/make-server-e150488f/users/me", requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const userProfile = await kv.get(`user:${user.id}`);

    return c.json({ user: userProfile });
  } catch (error) {
    console.error('Get user error:', error);
    return c.json({ error: 'Failed to get user profile' }, 500);
  }
});

// Get all users (Admin only)
app.get("/make-server-e150488f/users", requireAuth, async (c) => {
  try {
    const currentUser = c.get('user');
    const currentUserProfile = await kv.get(`user:${currentUser.id}`);

    if (currentUserProfile?.role !== 'admin') {
      return c.json({ error: 'Forbidden - Admin access required' }, 403);
    }

    const users = await kv.getByPrefix('user:');
    return c.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    return c.json({ error: 'Failed to get users' }, 500);
  }
});

// Update user (Admin only)
app.put("/make-server-e150488f/users/:id", requireAuth, async (c) => {
  try {
    const currentUser = c.get('user');
    const currentUserProfile = await kv.get(`user:${currentUser.id}`);

    if (currentUserProfile?.role !== 'admin') {
      return c.json({ error: 'Forbidden - Admin access required' }, 403);
    }

    const userId = c.req.param('id');
    const updates = await c.req.json();

    const existingUser = await kv.get(`user:${userId}`);
    if (!existingUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    const updatedUser = { ...existingUser, ...updates, updatedAt: new Date().toISOString() };
    await kv.set(`user:${userId}`, updatedUser);

    return c.json({ user: updatedUser });
  } catch (error) {
    console.error('Update user error:', error);
    return c.json({ error: 'Failed to update user' }, 500);
  }
});

// ==================== CATEGORY ROUTES ====================

// Get all categories
app.get("/make-server-e150488f/categories", requireAuth, async (c) => {
  try {
    const categories = await kv.getByPrefix('category:');
    return c.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    return c.json({ error: 'Failed to get categories' }, 500);
  }
});

// Create category
app.post("/make-server-e150488f/categories", requireAuth, async (c) => {
  try {
    const { name, type, isActive } = await c.req.json();
    const user = c.get('user');

    const id = crypto.randomUUID();
    const category = {
      id,
      name,
      type, // 'expense' or 'income'
      isActive: isActive !== undefined ? isActive : true,
      createdBy: user.id,
      createdAt: new Date().toISOString(),
    };

    await kv.set(`category:${id}`, category);
    return c.json({ category });
  } catch (error) {
    console.error('Create category error:', error);
    return c.json({ error: 'Failed to create category' }, 500);
  }
});

// Update category
app.put("/make-server-e150488f/categories/:id", requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    const updates = await c.req.json();

    const existing = await kv.get(`category:${id}`);
    if (!existing) {
      return c.json({ error: 'Category not found' }, 404);
    }

    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    await kv.set(`category:${id}`, updated);

    return c.json({ category: updated });
  } catch (error) {
    console.error('Update category error:', error);
    return c.json({ error: 'Failed to update category' }, 500);
  }
});

// Delete category
app.delete("/make-server-e150488f/categories/:id", requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    await kv.del(`category:${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.error('Delete category error:', error);
    return c.json({ error: 'Failed to delete category' }, 500);
  }
});

// ==================== SUBCATEGORY ROUTES ====================

// Get all subcategories
app.get("/make-server-e150488f/subcategories", requireAuth, async (c) => {
  try {
    const subcategories = await kv.getByPrefix('subcategory:');
    return c.json({ subcategories });
  } catch (error) {
    console.error('Get subcategories error:', error);
    return c.json({ error: 'Failed to get subcategories' }, 500);
  }
});

// Create subcategory
app.post("/make-server-e150488f/subcategories", requireAuth, async (c) => {
  try {
    const { name, categoryId, isActive } = await c.req.json();
    const user = c.get('user');

    const id = crypto.randomUUID();
    const subcategory = {
      id,
      name,
      categoryId,
      isActive: isActive !== undefined ? isActive : true,
      createdBy: user.id,
      createdAt: new Date().toISOString(),
    };

    await kv.set(`subcategory:${id}`, subcategory);
    return c.json({ subcategory });
  } catch (error) {
    console.error('Create subcategory error:', error);
    return c.json({ error: 'Failed to create subcategory' }, 500);
  }
});

// Update subcategory
app.put("/make-server-e150488f/subcategories/:id", requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    const updates = await c.req.json();

    const existing = await kv.get(`subcategory:${id}`);
    if (!existing) {
      return c.json({ error: 'Subcategory not found' }, 404);
    }

    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    await kv.set(`subcategory:${id}`, updated);

    return c.json({ subcategory: updated });
  } catch (error) {
    console.error('Update subcategory error:', error);
    return c.json({ error: 'Failed to update subcategory' }, 500);
  }
});

// Delete subcategory
app.delete("/make-server-e150488f/subcategories/:id", requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    await kv.del(`subcategory:${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.error('Delete subcategory error:', error);
    return c.json({ error: 'Failed to delete subcategory' }, 500);
  }
});

// ==================== PROJECT ROUTES ====================

// Get all projects
app.get("/make-server-e150488f/projects", requireAuth, async (c) => {
  try {
    const projects = await kv.getByPrefix('project:');
    return c.json({ projects });
  } catch (error) {
    console.error('Get projects error:', error);
    return c.json({ error: 'Failed to get projects' }, 500);
  }
});

// Create project
app.post("/make-server-e150488f/projects", requireAuth, async (c) => {
  try {
    const { name, description, startDate, endDate, status } = await c.req.json();
    const user = c.get('user');

    const id = crypto.randomUUID();
    const project = {
      id,
      name,
      description,
      startDate,
      endDate,
      status: status || 'active',
      createdBy: user.id,
      createdAt: new Date().toISOString(),
    };

    await kv.set(`project:${id}`, project);
    return c.json({ project });
  } catch (error) {
    console.error('Create project error:', error);
    return c.json({ error: 'Failed to create project' }, 500);
  }
});

// Update project
app.put("/make-server-e150488f/projects/:id", requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    const updates = await c.req.json();

    const existing = await kv.get(`project:${id}`);
    if (!existing) {
      return c.json({ error: 'Project not found' }, 404);
    }

    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    await kv.set(`project:${id}`, updated);

    return c.json({ project: updated });
  } catch (error) {
    console.error('Update project error:', error);
    return c.json({ error: 'Failed to update project' }, 500);
  }
});

// Delete project
app.delete("/make-server-e150488f/projects/:id", requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    await kv.del(`project:${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.error('Delete project error:', error);
    return c.json({ error: 'Failed to delete project' }, 500);
  }
});

// ==================== EXPENSE ROUTES ====================

// Get all expenses
app.get("/make-server-e150488f/expenses", requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const userProfile = await kv.get(`user:${user.id}`);
    
    let expenses = await kv.getByPrefix('expense:');
    
    // Normal users can only see their own expenses
    if (userProfile?.role !== 'admin') {
      expenses = expenses.filter((exp: any) => exp.userId === user.id);
    }

    return c.json({ expenses });
  } catch (error) {
    console.error('Get expenses error:', error);
    return c.json({ error: 'Failed to get expenses' }, 500);
  }
});

// Create expense
app.post("/make-server-e150488f/expenses", requireAuth, async (c) => {
  try {
    const { date, categoryId, subcategoryId, projectId, amount, remarks, attachment } = await c.req.json();
    const user = c.get('user');

    const id = crypto.randomUUID();
    const expense = {
      id,
      userId: user.id,
      date,
      categoryId,
      subcategoryId,
      projectId,
      amount: parseFloat(amount),
      remarks,
      attachment,
      createdAt: new Date().toISOString(),
    };

    await kv.set(`expense:${id}`, expense);
    return c.json({ expense });
  } catch (error) {
    console.error('Create expense error:', error);
    return c.json({ error: 'Failed to create expense' }, 500);
  }
});

// Update expense
app.put("/make-server-e150488f/expenses/:id", requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    const updates = await c.req.json();
    const user = c.get('user');

    const existing = await kv.get(`expense:${id}`);
    if (!existing) {
      return c.json({ error: 'Expense not found' }, 404);
    }

    // Check ownership
    const userProfile = await kv.get(`user:${user.id}`);
    if (userProfile?.role !== 'admin' && existing.userId !== user.id) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    await kv.set(`expense:${id}`, updated);

    return c.json({ expense: updated });
  } catch (error) {
    console.error('Update expense error:', error);
    return c.json({ error: 'Failed to update expense' }, 500);
  }
});

// Delete expense
app.delete("/make-server-e150488f/expenses/:id", requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    const user = c.get('user');

    const existing = await kv.get(`expense:${id}`);
    if (!existing) {
      return c.json({ error: 'Expense not found' }, 404);
    }

    // Check ownership
    const userProfile = await kv.get(`user:${user.id}`);
    if (userProfile?.role !== 'admin' && existing.userId !== user.id) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    await kv.del(`expense:${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.error('Delete expense error:', error);
    return c.json({ error: 'Failed to delete expense' }, 500);
  }
});

// ==================== INCOME ROUTES ====================

// Get all incomes
app.get("/make-server-e150488f/incomes", requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const userProfile = await kv.get(`user:${user.id}`);
    
    let incomes = await kv.getByPrefix('income:');
    
    // Normal users can only see their own incomes
    if (userProfile?.role !== 'admin') {
      incomes = incomes.filter((inc: any) => inc.userId === user.id);
    }

    return c.json({ incomes });
  } catch (error) {
    console.error('Get incomes error:', error);
    return c.json({ error: 'Failed to get incomes' }, 500);
  }
});

// Create income
app.post("/make-server-e150488f/incomes", requireAuth, async (c) => {
  try {
    const { date, categoryId, subcategoryId, projectId, amount, remarks, attachment } = await c.req.json();
    const user = c.get('user');

    const id = crypto.randomUUID();
    const income = {
      id,
      userId: user.id,
      date,
      categoryId,
      subcategoryId,
      projectId,
      amount: parseFloat(amount),
      remarks,
      attachment,
      createdAt: new Date().toISOString(),
    };

    await kv.set(`income:${id}`, income);
    return c.json({ income });
  } catch (error) {
    console.error('Create income error:', error);
    return c.json({ error: 'Failed to create income' }, 500);
  }
});

// Update income
app.put("/make-server-e150488f/incomes/:id", requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    const updates = await c.req.json();
    const user = c.get('user');

    const existing = await kv.get(`income:${id}`);
    if (!existing) {
      return c.json({ error: 'Income not found' }, 404);
    }

    // Check ownership
    const userProfile = await kv.get(`user:${user.id}`);
    if (userProfile?.role !== 'admin' && existing.userId !== user.id) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    await kv.set(`income:${id}`, updated);

    return c.json({ income: updated });
  } catch (error) {
    console.error('Update income error:', error);
    return c.json({ error: 'Failed to update income' }, 500);
  }
});

// Delete income
app.delete("/make-server-e150488f/incomes/:id", requireAuth, async (c) => {
  try {
    const id = c.req.param('id');
    const user = c.get('user');

    const existing = await kv.get(`income:${id}`);
    if (!existing) {
      return c.json({ error: 'Income not found' }, 404);
    }

    // Check ownership
    const userProfile = await kv.get(`user:${user.id}`);
    if (userProfile?.role !== 'admin' && existing.userId !== user.id) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    await kv.del(`income:${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.error('Delete income error:', error);
    return c.json({ error: 'Failed to delete income' }, 500);
  }
});

// ==================== ANALYTICS/REPORTS ROUTES ====================

// Get dashboard stats
app.get("/make-server-e150488f/analytics/dashboard", requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const userProfile = await kv.get(`user:${user.id}`);
    
    let expenses = await kv.getByPrefix('expense:');
    let incomes = await kv.getByPrefix('income:');
    
    // Filter for normal users
    if (userProfile?.role !== 'admin') {
      expenses = expenses.filter((exp: any) => exp.userId === user.id);
      incomes = incomes.filter((inc: any) => inc.userId === user.id);
    }

    const totalExpenses = expenses.reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0);
    const totalIncomes = incomes.reduce((sum: number, inc: any) => sum + (inc.amount || 0), 0);

    // Current month calculations
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyExpenses = expenses.filter((exp: any) => {
      const expDate = new Date(exp.date);
      return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
    });

    const monthlyIncomes = incomes.filter((inc: any) => {
      const incDate = new Date(inc.date);
      return incDate.getMonth() === currentMonth && incDate.getFullYear() === currentYear;
    });

    const monthlyExpenseTotal = monthlyExpenses.reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0);
    const monthlyIncomeTotal = monthlyIncomes.reduce((sum: number, inc: any) => sum + (inc.amount || 0), 0);

    return c.json({
      totalExpenses,
      totalIncomes,
      balance: totalIncomes - totalExpenses,
      monthlyExpenses: monthlyExpenseTotal,
      monthlyIncomes: monthlyIncomeTotal,
      monthlyBalance: monthlyIncomeTotal - monthlyExpenseTotal,
      expenseCount: expenses.length,
      incomeCount: incomes.length,
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    return c.json({ error: 'Failed to get dashboard stats' }, 500);
  }
});

// Get category-wise breakdown
app.get("/make-server-e150488f/analytics/category-breakdown", requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const userProfile = await kv.get(`user:${user.id}`);
    const type = c.req.query('type') || 'expense'; // 'expense' or 'income'
    
    let transactions = type === 'expense' 
      ? await kv.getByPrefix('expense:')
      : await kv.getByPrefix('income:');
    
    // Filter for normal users
    if (userProfile?.role !== 'admin') {
      transactions = transactions.filter((t: any) => t.userId === user.id);
    }

    const categories = await kv.getByPrefix('category:');
    
    const breakdown = categories
      .filter((cat: any) => cat.type === type)
      .map((cat: any) => {
        const categoryTransactions = transactions.filter((t: any) => t.categoryId === cat.id);
        const total = categoryTransactions.reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
        return {
          categoryId: cat.id,
          categoryName: cat.name,
          total,
          count: categoryTransactions.length,
        };
      })
      .filter((item: any) => item.total > 0);

    return c.json({ breakdown });
  } catch (error) {
    console.error('Get category breakdown error:', error);
    return c.json({ error: 'Failed to get category breakdown' }, 500);
  }
});

// Get monthly trends
app.get("/make-server-e150488f/analytics/monthly-trends", requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const userProfile = await kv.get(`user:${user.id}`);
    const months = parseInt(c.req.query('months') || '12');
    
    let expenses = await kv.getByPrefix('expense:');
    let incomes = await kv.getByPrefix('income:');
    
    // Filter for normal users
    if (userProfile?.role !== 'admin') {
      expenses = expenses.filter((exp: any) => exp.userId === user.id);
      incomes = incomes.filter((inc: any) => inc.userId === user.id);
    }

    const trends = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = date.getMonth();
      const year = date.getFullYear();

      const monthExpenses = expenses.filter((exp: any) => {
        const expDate = new Date(exp.date);
        return expDate.getMonth() === month && expDate.getFullYear() === year;
      });

      const monthIncomes = incomes.filter((inc: any) => {
        const incDate = new Date(inc.date);
        return incDate.getMonth() === month && incDate.getFullYear() === year;
      });

      const expenseTotal = monthExpenses.reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0);
      const incomeTotal = monthIncomes.reduce((sum: number, inc: any) => sum + (inc.amount || 0), 0);

      trends.push({
        month: date.toLocaleString('default', { month: 'short', year: 'numeric' }),
        expenses: expenseTotal,
        incomes: incomeTotal,
        balance: incomeTotal - expenseTotal,
      });
    }

    return c.json({ trends });
  } catch (error) {
    console.error('Get monthly trends error:', error);
    return c.json({ error: 'Failed to get monthly trends' }, 500);
  }
});

// Get project-wise breakdown
app.get("/make-server-e150488f/analytics/project-breakdown", requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const userProfile = await kv.get(`user:${user.id}`);
    
    let expenses = await kv.getByPrefix('expense:');
    let incomes = await kv.getByPrefix('income:');
    
    // Filter for normal users
    if (userProfile?.role !== 'admin') {
      expenses = expenses.filter((exp: any) => exp.userId === user.id);
      incomes = incomes.filter((inc: any) => inc.userId === user.id);
    }

    const projects = await kv.getByPrefix('project:');
    
    const breakdown = projects.map((proj: any) => {
      const projectExpenses = expenses.filter((exp: any) => exp.projectId === proj.id);
      const projectIncomes = incomes.filter((inc: any) => inc.projectId === proj.id);
      
      const totalExpenses = projectExpenses.reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0);
      const totalIncomes = projectIncomes.reduce((sum: number, inc: any) => sum + (inc.amount || 0), 0);
      
      return {
        projectId: proj.id,
        projectName: proj.name,
        totalExpenses,
        totalIncomes,
        balance: totalIncomes - totalExpenses,
        expenseCount: projectExpenses.length,
        incomeCount: projectIncomes.length,
      };
    });

    return c.json({ breakdown });
  } catch (error) {
    console.error('Get project breakdown error:', error);
    return c.json({ error: 'Failed to get project breakdown' }, 500);
  }
});

Deno.serve(app.fetch);
