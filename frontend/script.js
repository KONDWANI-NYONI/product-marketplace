// API Configuration - Use absolute URL
const API_BASE_URL = 'https://product-marketplace-api.onrender.com';

console.log('🚀 Starting application...');
console.log('🌐 API Base URL:', API_BASE_URL);

// Test API connection on load
async function testConnection() {
    try {
        console.log('🔌 Testing API connection...');
        const response = await fetch(`${API_BASE_URL}/health`);
        if (response.ok) {
            const data = await response.json();
            console.log('✅ API Connection OK:', data);
            return true;
        } else {
            console.error('❌ API Connection failed:', response.status);
            return false;
        }
    } catch (error) {
        console.error('❌ API Connection error:', error);
        return false;
    }
}

// Show notification
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    if (notification) {
        notification.textContent = message;
        notification.className = `notification ${type}`;
        
        setTimeout(() => {
            notification.className = 'notification';
        }, 5000);
    }
}

// Load products for homepage
async function loadProducts(limit = 6) {
    console.log('🔄 Loading products...');
    
    // First test connection
    const connected = await testConnection();
    if (!connected) {
        showNotification('Cannot connect to server. Please try again later.', 'error');
        return;
    }
    
    try {
        console.log(`📡 Fetching: ${API_BASE_URL}/api/products?limit=${limit}`);
        
        // Add timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(`${API_BASE_URL}/api/products?limit=${limit}`, {
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        console.log('📊 Response status:', response.status, response.statusText);
        
        if (!response.ok) {
            let errorMsg = `Server error: ${response.status} ${response.statusText}`;
            try {
                const errorData = await response.json();
                errorMsg = errorData.error || errorMsg;
            } catch (e) {
                // Couldn't parse JSON error
            }
            throw new Error(errorMsg);
        }
        
        const products = await response.json();
        console.log(`✅ Success! Loaded ${products.length} products`);
        displayProducts(products);
        
    } catch (error) {
        console.error('❌ Error loading products:', error);
        
        let errorMessage = 'Failed to load products. ';
        if (error.name === 'AbortError') {
            errorMessage += 'Request timed out.';
        } else if (error.message.includes('Failed to fetch')) {
            errorMessage += 'Network error. Check your connection.';
        } else {
            errorMessage += error.message;
        }
        
        showNotification(errorMessage, 'error');
        
        // Show sample products if API fails
        displaySampleProducts();
    }
}

// Display sample products (fallback)
function displaySampleProducts() {
    const container = document.getElementById('productsContainer');
    if (!container) return;
    
    const sampleProducts = [
        {
            name: "Sample Headphones",
            description: "Wireless Bluetooth headphones",
            price: 99.99,
            category: "electronics",
            image_url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop"
        },
        {
            name: "Sample Book",
            description: "Programming guide",
            price: 49.99,
            category: "books",
            image_url: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&h=300&fit=crop"
        }
    ];
    
    displayProducts(sampleProducts);
}

// Display products
function displayProducts(products, containerId = 'productsContainer') {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error('❌ Container not found:', containerId);
        return;
    }
    
    container.innerHTML = '';
    
    if (!products || products.length === 0) {
        container.innerHTML = '<p class="no-products">No products found</p>';
        return;
    }
    
    console.log(`🖼️ Displaying ${products.length} products`);
    
    products.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        
        productCard.innerHTML = `
            <img src="${product.image_url || 'https://via.placeholder.com/400x300?text=No+Image'}" 
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
document.addEventListener('DOMContentLoaded', () => {
    console.log('📝 DOM loaded');
    
    const productForm = document.getElementById('productForm');
    
    if (productForm) {
        console.log('✅ Form found, adding event listener');
        
        productForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('📤 Form submitted');
            
            const product = {
                name: document.getElementById('name').value.trim(),
                description: document.getElementById('description').value.trim(),
                price: parseFloat(document.getElementById('price').value),
                category: document.getElementById('category').value,
                image: document.getElementById('image').value.trim() || null
            };
            
            console.log('Product data:', product);
            
            // Validate
            if (!product.name || !product.description || !product.price || !product.category) {
                showNotification('Please fill in all required fields', 'error');
                return;
            }
            
            showNotification('Posting product...', 'success');
            
            try {
                const response = await fetch(`${API_BASE_URL}/api/products`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(product)
                });
                
                console.log('POST Response:', response.status);
                
                if (response.ok) {
                    const result = await response.json();
                    console.log('✅ Product created:', result);
                    showNotification('Product posted successfully!', 'success');
                    productForm.reset();
                    
                    // Reload products after 1 second
                    setTimeout(() => loadProducts(), 1000);
                } else {
                    const errorText = await response.text();
                    console.error('Server error:', errorText);
                    throw new Error(`Server returned ${response.status}: ${errorText}`);
                }
            } catch (error) {
                console.error('❌ Error posting product:', error);
                showNotification(`Failed to post product: ${error.message}`, 'error');
            }
        });
    } else {
        console.error('❌ Form element not found!');
    }
    
    // Initial load
    console.log('🚀 Starting initial product load...');
    loadProducts(6);
});

// Export for global use
window.loadProducts = loadProducts;
