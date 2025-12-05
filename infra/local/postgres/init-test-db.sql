-- Test Database Initialization Script
-- This database simulates a user's database for testing database workflow nodes

-- Create a sample users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255),
    age INTEGER,
    city VARCHAR(100),
    country VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create a sample products table
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    stock_quantity INTEGER DEFAULT 0,
    category VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create a sample orders table
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    total_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample users
INSERT INTO users (username, email, full_name, age, city, country) VALUES
('john_doe', 'john@example.com', 'John Doe', 30, 'New York', 'USA'),
('jane_smith', 'jane@example.com', 'Jane Smith', 28, 'London', 'UK'),
('bob_wilson', 'bob@example.com', 'Bob Wilson', 35, 'Toronto', 'Canada'),
('alice_brown', 'alice@example.com', 'Alice Brown', 25, 'Sydney', 'Australia'),
('charlie_davis', 'charlie@example.com', 'Charlie Davis', 42, 'Berlin', 'Germany')
ON CONFLICT (username) DO NOTHING;

-- Insert sample products
INSERT INTO products (name, description, price, stock_quantity, category) VALUES
('Laptop', 'High-performance laptop for professionals', 1299.99, 50, 'Electronics'),
('Smartphone', 'Latest model smartphone with advanced features', 899.99, 100, 'Electronics'),
('Coffee Maker', 'Automatic coffee maker with timer', 79.99, 30, 'Home & Kitchen'),
('Running Shoes', 'Comfortable running shoes for athletes', 129.99, 75, 'Sports'),
('Backpack', 'Durable backpack for travel and daily use', 49.99, 120, 'Accessories'),
('Wireless Mouse', 'Ergonomic wireless mouse', 29.99, 200, 'Electronics'),
('Desk Lamp', 'LED desk lamp with adjustable brightness', 39.99, 60, 'Home & Kitchen'),
('Water Bottle', 'Insulated stainless steel water bottle', 24.99, 150, 'Sports'),
('Headphones', 'Noise-cancelling over-ear headphones', 199.99, 80, 'Electronics'),
('Yoga Mat', 'Non-slip yoga mat for fitness enthusiasts', 34.99, 90, 'Sports');

-- Insert sample orders
INSERT INTO orders (user_id, total_amount, status) VALUES
(1, 1299.99, 'completed'),
(1, 129.99, 'completed'),
(2, 899.99, 'pending'),
(3, 79.99, 'shipped'),
(4, 49.99, 'completed'),
(5, 229.98, 'processing');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_city ON users(city);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- Add comments
COMMENT ON TABLE users IS 'Sample users table for testing database node queries';
COMMENT ON TABLE products IS 'Sample products table for testing database node queries';
COMMENT ON TABLE orders IS 'Sample orders table for testing database node queries';

-- Ensure timezone defaults to UTC for sessions
ALTER DATABASE test_database SET timezone TO 'UTC';
ALTER ROLE test_user SET timezone TO 'UTC';
