// API Configuration
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:3000' 
    : 'https://your-backend-url.onrender.com'; // Update with your Render backend URL

// Show notification
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    
    setTimeout(() => {
        notification.className = 'notification';
    }, 3000);
}

// Load products for homepage
async function loadProducts(limit = 6) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/products?limit=${limit}`);
        if (!response.ok) throw new Error('Failed to load products');
        
        const products = await response.json();
        displayProducts(products);
    } catch (error) {
        console.error('Error loading products:', error);
        showNotification('Failed to load products', 'error');
    }
}

// Display products
function displayProducts(products, containerId = 'productsContainer') {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!products || products.length === 0) {
        container.innerHTML = '<p class="no-products">No products found</p>';
        return;
    }
    
    products.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        
        productCard.innerHTML = `
            <img src="${product.image || 'https://via.placeholder.com/400x300?text=No+Image'}" 
                 alt="${product.name}" 
                 class="product-image"
                 onerror="this.src='https://via.placeholder.com/400x300?text=No+Image'">
            <div class="product-content">
                <h3 class="product-title">${product.name}</h3>
                <p class="product-description">${product.description}</p>
                <div class="product-price">$${parseFloat(product.price).toFixed(2)}</div>
                <span class="product-category">${product.category}</span>
            </div>
        `;
        
        container.appendChild(productCard);
    });
}

// Handle product form submission
document.addEventListener('DOMContentLoaded', () => {
    const productForm = document.getElementById('productForm');
    const categoryFilter = document.getElementById('categoryFilter');
    const sortFilter = document.getElementById('sortFilter');
    
    // Handle new product submission
    if (productForm) {
        productForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const product = {
                name: document.getElementById('name').value,
                description: document.getElementById('description').value,
                price: parseFloat(document.getElementById('price').value),
                category: document.getElementById('category').value,
                image: document.getElementById('image').value || null
            };
            
            try {
                const response = await fetch(`${API_BASE_URL}/api/products`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(product)
                });
                
                if (response.ok) {
                    showNotification('Product posted successfully!');
                    productForm.reset();
                    
                    // Reload products on homepage
                    if (window.location.pathname === '/' || window.location.pathname.includes('index.html')) {
                        loadProducts();
                    }
                } else {
                    throw new Error('Failed to post product');
                }
            } catch (error) {
                console.error('Error posting product:', error);
                showNotification('Failed to post product', 'error');
            }
        });
    }
    
    // Handle product filtering
    if (categoryFilter) {
        categoryFilter.addEventListener('change', loadFilteredProducts);
    }
    
    if (sortFilter) {
        sortFilter.addEventListener('change', loadFilteredProducts);
    }
    
    // Initial load
    if (window.location.pathname === '/' || window.location.pathname.includes('index.html')) {
        loadProducts(6);
    } else if (window.location.pathname.includes('products.html')) {
        loadAllProducts();
    }
});

// Load all products with filters
async function loadAllProducts() {
    try {
        const category = document.getElementById('categoryFilter')?.value || '';
        const sort = document.getElementById('sortFilter')?.value || 'newest';
        
        let url = `${API_BASE_URL}/api/products`;
        const params = new URLSearchParams();
        
        if (category) params.append('category', category);
        if (sort) params.append('sort', sort);
        
        if (params.toString()) {
            url += `?${params.toString()}`;
        }
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to load products');
        
        const products = await response.json();
        
        // Update product count
        const countElement = document.getElementById('productsCount');
        if (countElement) {
            countElement.textContent = `Found ${products.length} products`;
        }
        
        displayProducts(products, 'productsGrid');
    } catch (error) {
        console.error('Error loading products:', error);
        showNotification('Failed to load products', 'error');
    }
}

// Export functions for global use
window.loadFilteredProducts = loadAllProducts;