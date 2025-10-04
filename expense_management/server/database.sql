-- This script sets up the database schema for the expense management app.

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Companies Table: Stores company information. Auto-created on first signup.
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    base_currency VARCHAR(3) NOT NULL DEFAULT 'USD'
);

-- Users Table: Stores user data, roles, and links to company and manager.
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'manager', 'employee')),
    company_id UUID REFERENCES companies(id),
    manager_id UUID REFERENCES users(id), -- Self-referencing for manager relationship
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expenses Table: Core table for all expense claims.
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES users(id),
    company_id UUID NOT NULL REFERENCES companies(id),
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    category VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- This field will store the sequence of who needs to approve next.
    -- For simplicity in the prototype, we'll track the current approver.
    current_approver_id UUID REFERENCES users(id)
);

-- Approvals Table: Tracks the history of each approval step.
CREATE TABLE approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_id UUID NOT NULL REFERENCES expenses(id),
    approver_id UUID NOT NULL REFERENCES users(id),
    status VARCHAR(50) NOT NULL CHECK (status IN ('approved', 'rejected')),
    comments TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);