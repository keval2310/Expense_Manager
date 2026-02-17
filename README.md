# Expense Manager System

A comprehensive full-stack expense and income management system with role-based access control, analytics, and reporting capabilities.

## Features

### Authentication & Authorization
- ✅ User signup and signin
- ✅ Role-based access (Admin / Normal User)
- ✅ JWT-based authentication
- ✅ Protected routes

### Core Functionality
- ✅ **Dashboard** - Overview with stats cards and charts
- ✅ **Expense Management** - Create, read, update, delete expenses
- ✅ **Income Management** - Full CRUD for incomes
- ✅ **Categories & Subcategories** - Organize transactions (expense/income types)
- ✅ **Projects** - Track expenses/incomes by project
- ✅ **Reports & Analytics** - Monthly trends, category breakdown, project-wise analysis
- ✅ **Export** - Excel and PDF export functionality
- ✅ **User Management** - Admin-only user listing and management

### Technical Features
- ✅ Responsive design (mobile-first)
- ✅ Modern UI with Tailwind CSS and shadcn/ui components
- ✅ Real-time data synchronization
- ✅ Charts and visualizations using Recharts
- ✅ Toast notifications for user feedback
- ✅ Loading states and error handling
- ✅ Search and filter capabilities

## Tech Stack

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **React Router v7** - Client-side routing
- **Tailwind CSS v4** - Styling
- **shadcn/ui** - Component library
- **Recharts** - Data visualization
- **date-fns** - Date formatting
- **XLSX** - Excel export
- **jsPDF** - PDF export
- **Sonner** - Toast notifications

### Backend
- **Node.js & Express** - Server environment
- **MySQL** - Database
- **JWT** - Token-based authentication
- **Multer** - File handling

## Architecture

```
┌─────────────────────────────────────────────┐
│           Frontend (React)                   │
│  ┌──────────────────────────────────────┐  │
│  │  Pages:                               │  │
│  │  - Login / Signup                     │  │
│  │  - Dashboard (charts & stats)         │  │
│  │  - Expenses / Incomes (CRUD)          │  │
│  │  - Categories & Subcategories         │  │
│  │  - Projects                           │  │
│  │  - Reports (analytics & export)       │  │
│  │  - Users (admin only)                 │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │  Context:                             │  │
│  │  - AuthContext (user state)           │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │  Services:                            │  │
│  │  - API service (REST calls)           │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
                     ↓ HTTPS
┌─────────────────────────────────────────────┐
│             Node.js / Express Server         │
│  ┌──────────────────────────────────────┐  │
│  │  Routes:                              │  │
│  │  - /api/auth/register                 │  │
│  │  - /api/auth/login                    │  │
│  │  - /api/users                         │  │
│  │  - /api/categories                    │  │
│  │  - /api/subcategories                 │  │
│  │  - /api/projects                      │  │
│  │  - /api/expenses                      │  │
│  │  - /api/incomes                       │  │
│  │  - /api/dashboard-stats               │  │
│  │  - /api/monthly-trends                │  │
│  │  - /api/category-breakdown            │  │
│  │  - /api/project-breakdown             │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │  Middleware:                          │  │
│  │  - CORS                               │  │
│  │  - Express JSON Parser                │  │
│  │  - Auth (JWT verification)            │  │
│  │  - Multer (File Uploads)              │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────┐
│                 MySQL Database               │
│  ┌──────────────────────────────────────┐  │
│  │  Tables:                              │  │
│  │  - users                              │  │
│  │  - categories                         │  │
│  │  - subcategories                      │  │
│  │  - projects                           │  │
│  │  - expenses                           │  │
│  │  - incomes                            │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

## Data Models

### User
- id, email, name, role (admin/user), createdAt

### Category
- id, name, type (expense/income), isActive, createdBy, createdAt

### Subcategory
- id, name, categoryId, isActive, createdBy, createdAt

### Project
- id, name, description, startDate, endDate, status, createdBy, createdAt

### Expense
- id, userId, date, categoryId, subcategoryId, projectId, amount, remarks, attachment, createdAt

### Income
- id, userId, date, categoryId, subcategoryId, projectId, amount, remarks, attachment, createdAt

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create new user account

### Users
- `GET /api/auth/me` - Get current user profile
- `GET /api/users` - List all users (admin only)
- `PUT /api/users/profile` - Update user profile
- `PUT /api/users/password` - Update user password

### Categories
- `GET /api/categories` - List all categories
- `POST /api/categories` - Create category
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category

### Subcategories
- `GET /api/subcategories` - List all subcategories
- `POST /api/subcategories` - Create subcategory
- `PUT /api/subcategories/:id` - Update subcategory
- `DELETE /api/subcategories/:id` - Delete subcategory

### Projects
- `GET /api/projects` - List all projects
- `POST /api/projects` - Create project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Expenses
- `GET /api/expenses` - List expenses (filtered by user role)
- `POST /api/expenses` - Create expense
- `PUT /api/expenses/:id` - Update expense
- `DELETE /api/expenses/:id` - Delete expense

### Incomes
- `GET /api/incomes` - List incomes (filtered by user role)
- `POST /api/incomes` - Create income
- `PUT /api/incomes/:id` - Update income
- `DELETE /api/incomes/:id` - Delete income

### Analytics
- `GET /api/dashboard-stats` - Get dashboard stats
- `GET /api/category-breakdown?type=expense|income` - Category-wise breakdown
- `GET /api/monthly-trends` - Monthly trends
- `GET /api/project-breakdown` - Project-wise summary

## User Roles

### Admin
- Full access to all features
- Can view all users' expenses and incomes
- Can manage other users
- Can access user management page

### Normal User
- Can only view/manage their own expenses and incomes
- Can create categories, subcategories, and projects
- Can generate reports for their own data
- Cannot access user management

## Getting Started

### Prerequisites
- Node.js and npm installed
- MySQL Server installed and running

### First Time Setup

1. **Database Setup**
   - Create a MySQL database named `expense_manager`.
   - Run the provided SQL script to create tables.
   - Configure `.env` with your DB credentials.

2. **Backend Setup**
   - Navigate to `server/` directory `cd server`
   - Install dependencies: `npm install`
   - Start server: `node server.js`

3. **Frontend Setup**
   - Navigate to root directory
   - Install dependencies: `npm install`
   - Start React app: `npm run dev`

4. **Create Admin Account**
   - Open browser and go to `http://localhost:5173`
   - Click "Sign Up" tab
   - Enter your details
   - Select "Admin" role
   - Click "Sign Up"

5. **Set Up Categories**
   - Navigate to "Categories & Subcategories"
   - Add expense categories (e.g., Food, Transport, Utilities)
   - Add income categories (e.g., Salary, Freelance, Investment)
   - Add subcategories under each category

4. **Create Projects** (Optional)
   - Navigate to "Projects"
   - Add projects to track expenses/incomes

5. **Start Recording**
   - Add expenses via "Expenses" page
   - Add incomes via "Incomes" page
   - View analytics on "Dashboard" and "Reports"

## Features Walkthrough

### Dashboard
- **Stats Cards**: Total income, total expenses, net balance, monthly summary
- **Charts**: Monthly trends (bar chart), Category breakdown (pie chart)
- **Quick Actions**: Links to add expense, income, or view reports

### Expenses & Incomes
- **Table View**: All transactions with search functionality
- **Create/Edit Form**: Date, category, subcategory, project, amount, remarks
- **Actions**: Edit and delete buttons for each transaction
- **Total Display**: Shows sum of filtered transactions

### Categories & Subcategories
- **Tabs**: Separate views for categories and subcategories
- **Type Toggle**: Expense or Income categories
- **Active Status**: Enable/disable categories
- **Parent Linking**: Subcategories linked to parent categories

### Projects
- **Card View**: Visual project cards with status badges
- **Status Options**: Active, Completed, On Hold
- **Date Tracking**: Start and end dates
- **Quick Actions**: Edit and delete

### Reports
- **Three Tabs**: Monthly trends, Category breakdown, Project breakdown
- **Visualizations**: Bar charts and pie charts
- **Export Options**: Excel and PDF download
- **12-Month View**: Historical data analysis

### User Management (Admin)
- **User Cards**: Display all users with roles
- **Role Badges**: Visual indication of admin/user status
- **User Details**: Name, email, join date

## Security Features

- ✅ Password-based authentication with bcrypt
- ✅ JWT token verification on all protected endpoints
- ✅ Role-based access control
- ✅ Ownership validation (users can only edit their own data)
- ✅ Admin-only routes and actions
- ✅ Secure password storage (bcrypt hashing)
- ✅ CORS configuration
- ✅ Input validation

## Best Practices Implemented

### Frontend
- Component-based architecture
- Custom hooks for data fetching
- Context API for global state
- Protected routes with authentication check
- Loading and error states
- Toast notifications for user feedback
- Responsive design patterns
- Optimistic UI updates

### Backend
- RESTful API design
- Middleware pattern (auth, CORS, logging)
- Error handling with detailed messages
- Data validation
- Consistent response format
- Service role key kept secure (server-side only)
- Transaction filtering by user/role

## Future Enhancements

- [ ] Receipt/bill file upload
- [ ] Recurring expenses/incomes
- [ ] Budget planning and alerts
- [ ] Multi-currency support
- [ ] Email notifications
- [ ] Advanced filtering (date range, amount range)
- [ ] Bulk operations
- [ ] Data import from CSV/Excel
- [ ] Mobile app (React Native)
- [ ] Dark mode
- [ ] Custom report builder
- [ ] Expense approval workflow

## Troubleshooting

### Common Issues

**Cannot sign in**
- Ensure you've created an account first
- Check credentials are correct
- Verify email format is valid

**No data showing**
- Create categories before adding expenses/incomes
- Check that you're signed in
- Refresh the page

**Export not working**
- Ensure you have data to export
- Check browser console for errors
- Try different browser if issue persists

**Admin features not showing**
- Verify you signed up with Admin role
- Sign out and sign back in

## Technical Notes

- Uses MySQL for relational data persistence
- All timestamps in ISO 8601 format
- Currency amounts stored as decimals with 2 decimal precision
- Date inputs use YYYY-MM-DD format
- Client-side routing with React Router v7
- Toast notifications auto-dismiss after 3 seconds

## Support

This is a full-stack application. For production use, consider:
- Adding comprehensive input validation (e.g., Zod)
- Implementing rate limiting on API
- Adding database indexes for performance
- Setting up proper backup strategies for MySQL
- Implementing audit logging
- Adding two-factor authentication
- Setting up monitoring and alerting
- Compliance with financial data regulations

---

**Note**: This application uses a local MySQL database for data persistence. For production applications handling financial data, ensure compliance with relevant regulations (GDPR, SOC 2, etc.) and implement additional security measures.
