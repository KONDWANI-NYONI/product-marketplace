// API Configuration
const API_BASE_URL = window.location.origin; // This automatically uses the current website URL

console.log('🚀 Starting Product Marketplace');
console.log('🌐 Current URL:', window.location.href);
console.log('🔗 API Base URL:', API_BASE_URL);

// Show notification
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    if (!notification) {
        console.warn('Notification element not found');
        return;
    }
    
    notification.textContent = message;
    notification.className = `notification ${type}`;
    
    setTimeout(() => {
        notification.className = 'notification';
    }, 4000);
}

// Simple function to load and display products
async function loadProducts(limit = 6) {
    console.log('🔄 Loading products...');
    
    const container = document.getElementById('productsContainer');
    if (!container) {
        console.error('Products container not found');
        return;
    }
    
    // Show loading state
    container.innerHTML = '<p class="no-products">Loading products...</p>';
    
    try {
        console.log(`📡 Fetching from: ${API_BASE_URL}/api/products`);
        
        // Simple fetch with timeout
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        
        const response = await fetch(`${API_BASE_URL}/api/products?limit=${limit}`, {
            signal: controller.signal,
            headers: {
                'Accept': 'application/json'
            }
        });
        
        clearTimeout(timeout);
        
        console.log('📊 Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const products = await response.json();
        console.log(`✅ Loaded ${products.length} products`);
        
        if (products.length === 0) {
            container.innerHTML = '<p class="no-products">No products found. Be the first to post one!</p>';
            return;
        }
        
        // Display products
        displayProducts(products);
        
    } catch (error) {
        console.error('❌ Error loading products:', error);
        
        // Show user-friendly error
        let errorMessage = 'Could not load products. ';
        
        if (error.name === 'AbortError') {
            errorMessage += 'Request timed out. The server might be starting up.';
        } else if (error.message.includes('Failed to fetch')) {
            errorMessage += 'Network error. Please check your connection.';
        } else {
            errorMessage += error.message;
        }
        
        container.innerHTML = `
            <div class="error-message">
                <p>${errorMessage}</p>
                <button onclick="loadProducts()" style="padding: 8px 16px; background: #667eea; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Try Again
                </button>
            </div>
        `;
        
        showNotification('Failed to load products', 'error');
    }
}

// Display products in the grid
function displayProducts(products, containerId = 'productsContainer') {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    
    products.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        
        // Use image_url from database (not image)
        const imageUrl = product.image_url || product.image || 'https://via.placeholder.com/400x300?text=No+Image';
        
        productCard.innerHTML = `
            <img src="${imageUrl}" 
                 alt="${product.name}" 
                 class="product-image"
                 onerror="this.onerror=null; this.src='https://via.placeholder.com/400x300?text=Image+Error'">
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
function setupForm() {
    const productForm = document.getElementById('productForm');
    if (!productForm) {
        console.warn('Product form not found');
        return;
    }
    
    console.log('✅ Setting up product form');
    
    productForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        console.log('📤 Form submitted');
        
        // Get form values
        const productData = {
            name: document.getElementById('name').value.trim(),
            description: document.getElementById('description').value.trim(),
            price: parseFloat(document.getElementById('price').value),
            category: document.getElementById('category').value,
            image: document.getElementById('image').value.trim() || null
        };
        
        console.log('Product data:', productData);
        
        // Basic validation
        if (!productData.name || !productData.description || isNaN(productData.price) || !productData.category) {
            showNotification('Please fill in all required fields', 'error');
            return;
        }
        
        // Show loading state
        const submitBtn = productForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Posting...';
        submitBtn.disabled = true;
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/products`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(productData)
            });
            
            console.log('POST Response status:', response.status);
            
            if (response.ok) {
                const result = await response.json();
                console.log('✅ Product created:', result);
                
                showNotification('Product posted successfully!', 'success');
                productForm.reset();
                
                // Reload products after a delay
                setTimeout(() => {
                    if (window.location.pathname === '/' || window.location.pathname.includes('index.html')) {
                        loadProducts();
                    }
                }, 1000);
                
            } else {
                const errorText = await response.text();
                console.error('Server error response:', errorText);
                throw new Error(`Server error: ${response.status}`);
            }
            
        } catch (error) {
            console.error('❌ Error posting product:', error);
            showNotification('Failed to post product. Please try again.', 'error');
            
        } finally {
            // Restore button
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('📝 DOM fully loaded and parsed');
    
    // Setup form
    setupForm();
    
    // Load products on homepage
    if (window.location.pathname === '/' || window.location.pathname.includes('index.html')) {
        console.log('🏠 On homepage, loading products...');
        loadProducts(6);
    }
    
    // Setup filter change listeners for products page
    const categoryFilter = document.getElementById('categoryFilter');
    const sortFilter = document.getElementById('sortFilter');
    
    if (categoryFilter) {
        categoryFilter.addEventListener('change', loadFilteredProducts);
    }
    
    if (sortFilter) {
        sortFilter.addEventListener('change', loadFilteredProducts);
    }
    
    // Add a refresh button for debugging
    addDebugTools();
});

// Function for filtered loading (used on products.html)
async function loadFilteredProducts() {
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
        
        console.log('Filter URL:', url);
        
        const response = await fetch(url);
        const products = await response.json();
        
        displayProducts(products, 'productsGrid');
        
        // Update count
        const countElement = document.getElementById('productsCount');
        if (countElement) {
            countElement.textContent = `Found ${products.length} products`;
        }
        
    } catch (error) {
        console.error('Filter error:', error);
        showNotification('Failed to filter products', 'error');
    }
}

// Add debug tools to page
function addDebugTools() {
    const debugDiv = document.createElement('div');
    debugDiv.style.cssText = `
        position: fixed;
        bottom: 10px;
        right: 10px;
        z-index: 9999;
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 10px;
        border-radius: 5px;
        font-size: 12px;
        font-family: monospace;
    `;
    
    debugDiv.innerHTML = `
        <div>API: <span id="apiStatus">Checking...</span></div>
        <button onclick="testAPI()" style="margin-top: 5px; padding: 3px 6px; font-size: 10px;">Test Connection</button>
        <button onclick="console.clear(); console.log('Console cleared')" style="margin-top: 5px; padding: 3px 6px; font-size: 10px; margin-left: 5px;">Clear Console</button>
    `;
    
    document.body.appendChild(debugDiv);
    
    // Test API connection
    setTimeout(() => {
        testAPI();
    }, 1000);
}

// Test API connection
async function testAPI() {
    const statusEl = document.getElementById('apiStatus');
    if (!statusEl) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        const data = await response.json();
        statusEl.textContent = '✅ Connected';
        statusEl.style.color = 'lightgreen';
        console.log('API Health:', data);
    } catch (error) {
        statusEl.textContent = '❌ Error';
        statusEl.style.color = 'red';
        console.error('API Test failed:', error);
    }
}

// Make functions available globally
window.loadProducts = loadProducts;
window.loadFilteredProducts = loadFilteredProducts;
window.testAPI = testAPI;

// Delete all products (Dangerous!)
async function deleteAllProducts() {
    if (!confirm('⚠️ DANGER: This will delete ALL products!\n\nThis action cannot be undone!\n\nAre you absolutely sure?')) {
        return;
    }
    
    const btn = document.getElementById('deleteAllBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting all...';
    btn.disabled = true;
    
    try {
        // Get all products first
        const response = await fetch(`${API_BASE_URL}/api/products`);
        const products = await response.json();
        
        if (products.length === 0) {
            showNotification('No products to delete', 'warning');
            btn.innerHTML = originalText;
            btn.disabled = false;
            return;
        }
        
        // Delete each product
        let deletedCount = 0;
        for (const product of products) {
            try {
                await fetch(`${API_BASE_URL}/api/products/${product.id}`, {
                    method: 'DELETE'
                });
                deletedCount++;
                console.log(`Deleted product ${product.id}: ${product.name}`);
            } catch (error) {
                console.error(`Failed to delete product ${product.id}:`, error);
            }
        }
        
        showNotification(`Deleted ${deletedCount} products successfully!`, 'success');
        
        // Reload products
        setTimeout(() => {
            if (window.location.pathname === '/' || window.location.pathname.includes('index.html')) {
                loadProducts();
            }
        }, 1000);
        
    } catch (error) {
        console.error('Error deleting all products:', error);
        showNotification('Failed to delete all products', 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// Make it available globally
window.deleteAllProducts = deleteAllProducts;
