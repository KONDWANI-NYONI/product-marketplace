const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Enhanced CORS configuration
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Serve static files from frontend
app.use(express.static('../frontend'));

// Database connection with better error handling
let pool;
try {
    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });
    console.log('✅ Database pool created');
} catch (error) {
    console.error('❌ Database pool creation failed:', error);
}

// Test database connection
const testConnection = async () => {
    try {
        const client = await pool.connect();
        console.log('✅ Connected to PostgreSQL database');
        
        // Create table if it doesn't exist
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
        console.log('✅ Products table is ready');
        
        client.release();
    } catch (error) {
        console.error('❌ Database connection error:', error.message);
    }
};

testConnection();

// API Routes

// Get all products
app.get('/api/products', async (req, res) => {
    try {
        const { category, sort = 'newest', limit } = req.query;
        
        let query = 'SELECT * FROM products';
        const params = [];
        
        if (category) {
            query += ' WHERE category = $1';
            params.push(category);
        }
        
        switch (sort) {
            case 'price_low': query += ' ORDER BY price ASC'; break;
            case 'price_high': query += ' ORDER BY price DESC'; break;
            default: query += ' ORDER BY created_at DESC';
        }
        
        if (limit) {
            query += ' LIMIT $' + (params.length + 1);
            params.push(parseInt(limit));
        }
        
        const result = await pool.query(query, params);
        console.log(`📦 Returning ${result.rows.length} products`);
        res.json(result.rows);
    } catch (error) {
        console.error('❌ Error fetching products:', error);
        res.status(500).json({ error: 'Failed to fetch products', details: error.message });
    }
});

// Create new product
app.post('/api/products', async (req, res) => {
    console.log('📝 Received product creation request:', req.body);
    
    try {
        const { name, description, price, category, image } = req.body;
        
        // Validation
        if (!name || !description || !price || !category) {
            console.log('❌ Missing fields:', { name, description, price, category });
            return res.status(400).json({ 
                error: 'Missing required fields',
                required: ['name', 'description', 'price', 'category']
            });
        }
        
        const result = await pool.query(
            'INSERT INTO products (name, description, price, category, image_url) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [name, description, parseFloat(price), category, image || null]
        );
        
        console.log('✅ Product created:', result.rows[0]);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('❌ Error creating product:', error.message);
        res.status(500).json({ 
            error: 'Failed to create product', 
            details: error.message,
            hint: 'Check database connection and table structure'
        });
    }
});

// Health check with database status
app.get('/health', async (req, res) => {
    try {
        const dbResult = await pool.query('SELECT NOW()');
        res.json({ 
            status: 'OK', 
            timestamp: new Date().toISOString(),
            database: 'Connected',
            dbTime: dbResult.rows[0].now
        });
    } catch (error) {
        res.status(500).json({ 
            status: 'ERROR', 
            database: 'Disconnected',
            error: error.message 
        });
    }
});

// Simple test endpoint
app.get('/api/test', (req, res) => {
    res.json({ message: 'API is working!', timestamp: new Date().toISOString() });
});

// Serve frontend for all other routes
app.get('*', (req, res) => {
    res.sendFile('index.html', { root: '../frontend' });
});

app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
    console.log(`🔗 Health check: http://localhost:${port}/health`);
    console.log(`🔗 API: http://localhost:${port}/api/products`);
});
