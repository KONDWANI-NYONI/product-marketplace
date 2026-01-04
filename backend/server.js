const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const port = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Database connection
const databaseUrl = 'postgresql://product_user:w92oa8qNUWqtnX91Bu2mMvG7DFuV97a0@dpg-d5d9tjuuk2gs738ruh40-a.virginia-postgres.render.com/product_marketplace';

const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
});

console.log('✅ Database pool created');

// Test database connection
const initializeDatabase = async () => {
    try {
        const client = await pool.connect();
        console.log('✅ Connected to PostgreSQL');
        
        // Create table if not exists
        await client.query(`
            CREATE TABLE IF NOT EXISTS products (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT NOT NULL,
                price DECIMAL(10, 2) NOT NULL,
                category VARCHAR(100) NOT NULL,
                image_url VARCHAR(500),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Products table ready');
        
        client.release();
    } catch (error) {
        console.error('❌ Database error:', error.message);
    }
};

initializeDatabase();

// API Routes
app.get('/api/products', async (req, res) => {
    try {
        const { category, sort = 'newest', limit } = req.query;
        let query = 'SELECT * FROM products';
        const params = [];
        
        if (category) {
            query += ' WHERE category = $1';
            params.push(category);
        }
        
        if (sort === 'price_low') query += ' ORDER BY price ASC';
        else if (sort === 'price_high') query += ' ORDER BY price DESC';
        else query += ' ORDER BY created_at DESC';
        
        if (limit) {
            query += ' LIMIT $' + (params.length + 1);
            params.push(parseInt(limit));
        }
        
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('GET /api/products error:', error);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

app.post('/api/products', async (req, res) => {
    try {
        const { name, description, price, category, image } = req.body;
        
        if (!name || !description || !price || !category) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        const result = await pool.query(
            'INSERT INTO products (name, description, price, category, image_url) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [name, description, parseFloat(price), category, image || null]
        );
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('POST /api/products error:', error);
        res.status(500).json({ error: 'Failed to create product' });
    }
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'Product Marketplace API'
    });
});

// Serve frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Start server
app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
    console.log(`🌐 Health check: http://localhost:${port}/health`);
    console.log(`🛒 Products API: http://localhost:${port}/api/products`);
});

// Handle errors
process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
});
