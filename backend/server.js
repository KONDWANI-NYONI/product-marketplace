const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const port = process.env.PORT || 10000;

// Admin token (in production, use environment variable)
const ADMIN_TOKEN = 'admin-secret-token-123';

// Configure CORS to allow all origins
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Admin-Token']
}));

app.use(express.json());

// Log all requests
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
});

// Admin middleware
const requireAdmin = (req, res, next) => {
    const token = req.headers['x-admin-token'] || req.query.admin_token;
    
    if (token === ADMIN_TOKEN) {
        console.log('✅ Admin access granted');
        next();
    } else {
        console.log('❌ Admin access denied');
        res.status(403).json({ 
            error: 'Admin access required',
            message: 'Valid admin token is required for this operation'
        });
    }
};

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

// Get all products (public)
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

// Get single product by ID (public)
app.get('/api/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`📥 GET /api/products/${id}`);
        
        const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('❌ Error fetching product:', error);
        res.status(500).json({ 
            error: 'Failed to fetch product',
            message: error.message 
        });
    }
});

// Create new product (public - anyone can post)
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

// UPDATE product by ID (admin only)
app.put('/api/products/:id', requireAdmin, async (req, res) => {
    console.log(`📥 PUT /api/products/${req.params.id} body:`, req.body);
    
    try {
        const { id } = req.params;
        const { name, description, price, category, image } = req.body;
        
        const result = await pool.query(
            'UPDATE products SET name = $1, description = $2, price = $3, category = $4, image_url = $5 WHERE id = $6 RETURNING *',
            [name, description, price, category, image, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        console.log('✅ Product updated:', id);
        res.json(result.rows[0]);
    } catch (error) {
        console.error('❌ Error updating product:', error);
        res.status(500).json({ 
            error: 'Failed to update product',
            message: error.message 
        });
    }
});

// DELETE product by ID (admin only)
app.delete('/api/products/:id', requireAdmin, async (req, res) => {
    console.log(`📥 DELETE /api/products/${req.params.id}`);
    
    try {
        const { id } = req.params;
        
        const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        console.log('✅ Product deleted:', id);
        res.json({ 
            success: true, 
            message: 'Product deleted successfully',
            deletedProduct: result.rows[0]
        });
    } catch (error) {
        console.error('❌ Error deleting product:', error);
        res.status(500).json({ 
            error: 'Failed to delete product',
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
        database: 'Connected',
        features: ['GET (public)', 'POST (public)', 'PUT (admin)', 'DELETE (admin)']
    });
});

// Admin login endpoint (for frontend to get token)
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    
    // In production, use proper password hashing
    if (password === 'admin123') {
        res.json({
            success: true,
            token: ADMIN_TOKEN,
            message: 'Admin login successful'
        });
    } else {
        res.status(401).json({
            success: false,
            error: 'Invalid credentials'
        });
    }
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
    console.log(`🔐 Admin token: ${ADMIN_TOKEN}`);
});
