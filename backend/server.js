const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const port = process.env.PORT || 10000;

// Configure CORS to allow all origins
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Log all requests
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
});

// Serve static files from frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Database connection
const databaseUrl = process.env.DATABASE_URL || 'postgresql://product_user:w92oa8qNUWqtnX91Bu2mMvG7DFuV97a0@dpg-d5d9tjuuk2gs738ruh40-a.virginia-postgres.render.com/product_marketplace';

const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
});

console.log('✅ Database pool created');

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
        console.log('📥 GET /api/products query:', req.query);
        
        const { category, sort = 'newest', limit } = req.query;
        
        let query = 'SELECT * FROM products';
        const params = [];
        
        if (category) {
            query += ' WHERE category = $1';
            params.push(category);
        }
        
        // Sorting
        switch (sort) {
            case 'price_low':
                query += ' ORDER BY price ASC';
                break;
            case 'price_high':
                query += ' ORDER BY price DESC';
                break;
            default:
                query += ' ORDER BY created_at DESC';
        }
        
        // Limiting
        if (limit) {
            query += ' LIMIT $' + (params.length + 1);
            params.push(parseInt(limit));
        }
        
        const result = await pool.query(query, params);
        console.log(`✅ Returning ${result.rows.length} products`);
        
        res.json(result.rows);
    } catch (error) {
        console.error('❌ Error fetching products:', error);
        res.status(500).json({ 
            error: 'Failed to fetch products',
            message: error.message 
        });
    }
});

// Create new product
app.post('/api/products', async (req, res) => {
    console.log('📥 POST /api/products body:', req.body);
    
    try {
        const { name, description, price, category, image } = req.body;
        
        // Validation
        if (!name || !description || !price || !category) {
            return res.status(400).json({ 
                error: 'Missing required fields',
                required: ['name', 'description', 'price', 'category']
            });
        }
        
        const result = await pool.query(
            'INSERT INTO products (name, description, price, category, image_url) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [name, description, parseFloat(price), category, image || null]
        );
        
        console.log('✅ Product created with ID:', result.rows[0].id);
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('❌ Error creating product:', error);
        res.status(500).json({ 
            error: 'Failed to create product',
            message: error.message 
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'Product Marketplace API',
        database: 'Connected'
    });
});

// Debug endpoint
app.get('/api/debug', (req, res) => {
    res.json({
        message: 'API is working',
        headers: req.headers,
        query: req.query,
        time: new Date().toISOString()
    });
});

// Serve frontend for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Start server
app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
    console.log(`🔗 Health check: http://localhost:${port}/health`);
    console.log(`🔗 Products API: http://localhost:${port}/api/products`);
    console.log(`🌐 Frontend: http://localhost:${port}`);
});
