-- Database setup for product marketplace

-- Create database (run this in PostgreSQL terminal or admin tool)
CREATE DATABASE product_marketplace;

-- Connect to the database and run the following:

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    category VARCHAR(100) NOT NULL,
    image_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_created_at ON products(created_at DESC);
CREATE INDEX idx_products_price ON products(price);

-- Insert sample data
INSERT INTO products (name, description, price, category, image_url) VALUES
('Wireless Bluetooth Headphones', 'Noise-cancelling headphones with 30-hour battery life', 99.99, 'electronics', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop'),
('Classic Leather Jacket', 'Genuine leather jacket with vintage design', 129.99, 'clothing', 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&h=300&fit=crop'),
('JavaScript: The Definitive Guide', 'Comprehensive guide to JavaScript programming', 49.99, 'books', 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w-400&h=300&fit=crop'),
('Smart Home Assistant', 'Voice-controlled smart assistant with AI', 79.99, 'electronics', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop'),
('Yoga Mat Premium', 'Non-slip yoga mat with carrying strap', 34.99, 'sports', 'https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?w=400&h=300&fit=crop'),
('Ceramic Coffee Mug Set', 'Set of 4 ceramic mugs with modern design', 24.99, 'home', 'https://images.unsplash.com/photo-1514228742587-6b1558fcf93a?w=400&h=300&fit=crop');