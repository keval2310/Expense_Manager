-- Database Setup for Expense Manager
DROP DATABASE IF EXISTS expense_manager;
CREATE DATABASE expense_manager;
USE expense_manager;

-- Users Table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    role VARCHAR(20) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Categories Table
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL -- 'expense' or 'income'
);

-- Subcategories Table
CREATE TABLE subcategories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category_id INT,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- Projects Table
CREATE TABLE projects (
    ProjectID INT AUTO_INCREMENT PRIMARY KEY,
    ProjectName VARCHAR(100) NOT NULL,
    ProjectLogo VARCHAR(255),
    ProjectStartDate DATE,
    ProjectEndDate DATE,
    ProjectDetail TEXT,
    Description TEXT,
    UserID INT, -- Changed to INT to match users.id
    Created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    Modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    IsActive BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (UserID) REFERENCES users(id) ON DELETE SET NULL
);

-- Expenses Table
CREATE TABLE expenses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    remarks TEXT,
    category_id INT,
    subcategory_id INT,
    project_id INT,
    user_id INT,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY (subcategory_id) REFERENCES subcategories(id) ON DELETE SET NULL,
    FOREIGN KEY (project_id) REFERENCES projects(ProjectID) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Incomes Table
CREATE TABLE incomes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    remarks TEXT,
    category_id INT,
    project_id INT,
    user_id INT,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY (project_id) REFERENCES projects(ProjectID) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Seed Data

-- Users
INSERT INTO users (id, name, email, role) VALUES 
(1, 'Local User', 'local@example.com', 'admin'),
(2, 'John Doe', 'john@example.com', 'user'),
(3, 'Alice Smith', 'alice@example.com', 'user');

-- Categories
INSERT INTO categories (id, name, type) VALUES 
(1, 'Food', 'expense'),
(2, 'Transport', 'expense'),
(3, 'Salary', 'income'),
(4, 'Utilities', 'expense');

-- Subcategories
INSERT INTO subcategories (id, name, category_id) VALUES 
(1, 'Groceries', 1),
(2, 'Restaurant', 1),
(3, 'Taxi', 2),
(4, 'Bus Fare', 2);

-- Projects
INSERT INTO projects (ProjectID, ProjectName, ProjectDetail, Description, UserID, ProjectStartDate) VALUES 
(1, 'Website Redesign', 'Redesigning company website', 'Complete overhaul of the main site', 1, CURDATE()),
(2, 'Mobile App', 'iOS and Android app', 'Native mobile application development', 1, CURDATE());

-- Expenses
INSERT INTO expenses (id, date, amount, remarks, category_id, project_id) VALUES 
(1, CURDATE(), 50.00, 'Lunch', 1, 1),
(2, CURDATE(), 20.00, 'Uber', 2, 1);

-- Incomes
INSERT INTO incomes (id, date, amount, remarks, category_id, project_id) VALUES 
(1, CURDATE(), 5000.00, 'Monthly Salary', 3, 1);
