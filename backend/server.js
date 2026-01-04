const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

// Remove dotenv requirement since we're hardcoding
// const dotenv = require('dotenv');
// dotenv.config();

const app = express();
const port = process.env.PORT || 10000; // Render uses 10000 for free tier

// CORS
app.use(cors());
app.use(express.json());

// Serve static files
app.use(express.static('../frontend'));

// Database connection
const databaseUrl = process.env.DATABASE_URL || 'postgresql://product_user:w92oa8qNUWqtnX91Bu2mMvG7DFuV97a0@dpg-d5d9tjuuk2gs738ruh40-a.virginia-postgres.render.com/product_marketplace';

const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
});

console.log('Database URL configured');

// Routes remain the same as Option A...
// Copy the routes from Option A starting from "Create table if not exists"
