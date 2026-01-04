// API Configuration
const API_BASE_URL = window.location.origin;

// FOR TESTING: Make admin always true
let isAdmin = true; // Changed to true for testing

console.log('🚀 Starting Product Marketplace');
console.log('🌐 Current URL:', window.location.href);
console.log('🔗 API Base URL:', API_BASE_URL);
console.log('👑 Admin mode:', isAdmin ? 'ENABLED' : 'DISABLED');

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

// Load products for homepage
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
        
        const response = await fetch(`${API_BASE_URL}/api/products?limit=${limit}`, {
            headers: {
                'Accept': 'application/json'
            }
        });
        
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
        
        // Display products with delete buttons
        displayProducts(products);
        
    } catch (error) {
        console.error('❌ Error loading products:', error);
        
        container.innerHTML = `
            <div class="error-message">
                <p>Could not load products: ${error.message}</p>
                <button onclick="loadProducts()" style="padding: 8px 16px; background: #667eea; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Try Again
                </button>
            </div>
        `;
        
        showNotification('Failed to load products', 'error');
    }
}

// Display products WITH delete buttons
function displayProducts(products, containerId = 'productsContainer') {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error('Container not found:', containerId);
        return;
    }
    
    container.innerHTML = '';
    
    if (!products || products.length === 0) {
        container.innerHTML = '<p class="no-products">No products found</p>';
        return;
    }
    
    console.log(`🖼️ Displaying ${products.length} products with delete buttons`);
    
    products.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.dataset.id = product.id;
        
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
                <div class="product-actions">
                    <button class="delete-btn" onclick="deleteProduct(${product.id}, '${product.name.replace(/'/g, "\\'")}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `;
        
        container.appendChild(productCard);
    });
}

// Delete product function
async function deleteProduct(productId, productName) {
    console.log(`🗑️  Deleting product ${productId}: ${productName}`);
    
    // Confirm deletion
    if (!confirm(`Are you sure you want to delete "${productName}"?`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/products/${productId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('DELETE Response status:', response.status);
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ Product deleted:', result);
            
            showNotification(`Product "${productName}" deleted successfully!`, 'success');
            
            // Remove the product card from the DOM
            const productCard = document.querySelector(`.product-card[data-id="${productId}"]`);
            if (productCard) {
                productCard.style.opacity = '0.5';
                productCard.style.transition = 'opacity 0.3s';
                setTimeout(() => productCard.remove(), 300);
            }
            
            // Reload products after 1 second
            setTimeout(() => {
                if (window.location.pathname === '/' || window.location.pathname.includes('index.html')) {
                    loadProducts();
                }
            }, 1000);
            
        } else {
            const errorText = await response.text();
            console.error('Server error response:', errorText);
            throw new Error(`Failed to delete: ${response.status}`);
        }
        
    } catch (error) {
        console.error('❌ Error deleting product:', error);
        showNotification(`Failed to delete product: ${error.message}`, 'error');
    }
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
    
    // Add admin indicator since we're in admin mode
    if (isAdmin) {
        const adminIndicator = document.createElement('div');
        adminIndicator.id = 'adminIndicator';
        adminIndicator.innerHTML = '👑 Admin Mode (Delete Enabled)';
        adminIndicator.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: #4CAF50;
            color: white;
            padding: 8px 15px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: bold;
            z-index: 10000;
            box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
        `;
        document.body.appendChild(adminIndicator);
    }
});

// Make functions available globally
window.loadProducts = loadProducts;
window.deleteProduct = deleteProduct;
