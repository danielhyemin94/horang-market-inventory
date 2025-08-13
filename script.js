console.log(‘App starting…’);

class InventoryManager {
constructor() {
console.log(‘InventoryManager constructor called’);
this.products = this.loadData();
this.scanner = null;
this.scanMode = ‘add’;
this.lastScannedCode = null;
this.scanConfidence = 0;
this.initializeEventListeners();
this.renderProducts();
this.updateStats();
console.log(‘Initial products:’, this.products);
}

```
loadData() {
    try {
        const data = localStorage.getItem('koreanMarketInventory');
        console.log('Loading data from localStorage:', data);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('Error loading data:', error);
        return [];
    }
}

saveData() {
    try {
        localStorage.setItem('koreanMarketInventory', JSON.stringify(this.products));
        console.log('Data saved to localStorage:', this.products);
    } catch (error) {
        console.error('Error saving data:', error);
    }
}

initializeEventListeners() {
    console.log('Setting up event listeners...');
    
    const form = document.getElementById('productForm');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            console.log('Form submitted');
            this.addProduct();
        });
    }
    
    const searchBox = document.getElementById('searchBox');
    if (searchBox) {
        searchBox.addEventListener('input', (e) => {
            this.searchProducts(e.target.value);
        });
    }
    
    const scanBtn = document.getElementById('scanBtn');
    if (scanBtn) {
        scanBtn.addEventListener('click', () => {
            this.toggleScanner();
        });
    }
    
    const quickScanBtn = document.getElementById('quickScanBtn');
    if (quickScanBtn) {
        quickScanBtn.addEventListener('click', () => {
            this.quickScan();
        });
    }
    
    const manualMode = document.getElementById('manualMode');
    if (manualMode) {
        manualMode.addEventListener('click', () => {
            this.setMode('manual');
        });
    }
    
    const cameraMode = document.getElementById('cameraMode');
    if (cameraMode) {
        cameraMode.addEventListener('click', () => {
            this.setMode('camera');
        });
    }
    
    const barcodeInput = document.getElementById('barcodeInput');
    if (barcodeInput) {
        barcodeInput.addEventListener('input', (e) => {
            const productBarcode = document.getElementById('productBarcode');
            if (productBarcode) {
                productBarcode.value = e.target.value;
            }
        });
    }
    
    const closeModal = document.getElementById('closeModal');
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            this.closeModal();
        });
    }
    
    window.addEventListener('click', (e) => {
        if (e.target === document.getElementById('productModal')) {
            this.closeModal();
        }
    });
    
    console.log('Event listeners set up successfully');
}

setMode(mode) {
    const manualBtn = document.getElementById('manualMode');
    const cameraBtn = document.getElementById('cameraMode');
    const cameraContainer = document.getElementById('cameraContainer');
    
    if (mode === 'manual') {
        manualBtn?.classList.add('active');
        cameraBtn?.classList.remove('active');
        if (cameraContainer) cameraContainer.style.display = 'none';
        this.stopScanner();
    } else {
        manualBtn?.classList.remove('active');
        cameraBtn?.classList.add('active');
        if (cameraContainer) cameraContainer.style.display = 'block';
    }
}

toggleScanner() {
    const btn = document.getElementById('scanBtn');
    const cameraContainer = document.getElementById('cameraContainer');
    
    if (this.scanner) {
        this.stopScanner();
        if (btn) btn.textContent = '📷 Scan';
        btn?.classList.remove('active');
        if (cameraContainer) cameraContainer.style.display = 'none';
    } else {
        this.startScanner();
        if (btn) btn.textContent = '⏹️ Stop';
        btn?.classList.add('active');
        if (cameraContainer) cameraContainer.style.display = 'block';
        this.setMode('camera');
    }
}

startScanner() {
    console.log('Starting scanner...');
    this.scanMode = 'add';
    this.lastScannedCode = null;
    this.scanConfidence = 0;
    
    if (typeof Quagga === 'undefined') {
        this.showNotification('Barcode scanner library not loaded', 'error');
        return;
    }
    
    Quagga.init({
        inputStream: {
            name: "Live",
            type: "LiveStream",
            target: document.querySelector('#camera'),
            constraints: {
                width: { ideal: 1280, min: 640 },
                height: { ideal: 720, min: 480 },
                facingMode: "environment"
            },
        },
        locator: {
            patchSize: "large",
            halfSample: false
        },
        numOfWorkers: 4,
        frequency: 5,
        decoder: {
            readers: [
                "code_128_reader",
                "ean_reader", 
                "ean_8_reader",
                "code_39_reader",
                "code_93_reader",
                "codabar_reader"
            ]
        },
        locate: true
    }, (err) => {
        if (err) {
            console.error('Scanner initialization error:', err);
            this.showNotification('Camera access denied. Please allow camera permission and try again.', 'error');
            return;
        }
        console.log('Scanner initialized successfully');
        Quagga.start();
        this.scanner = true;
    });

    // Simplified barcode detection - more lenient
    Quagga.onDetected((data) => {
        const barcode = data.codeResult.code;
        const confidence = data.codeResult.quality || 0;
        
        console.log('Barcode detected:', barcode, 'confidence:', confidence);
        
        // Lower confidence threshold and simpler logic
        if (confidence < 20) {
            console.log('Very low confidence scan, ignoring');
            return;
        }
        
        // Accept any decent scan immediately
        const barcodeInput = document.getElementById('barcodeInput');
        const productBarcode = document.getElementById('productBarcode');
        if (barcodeInput) barcodeInput.value = barcode;
        if (productBarcode) productBarcode.value = barcode;
        this.stopScanner();
        this.showNotification(`Barcode scanned: ${barcode}`, 'success');
        
        // Auto-switch to manual mode after successful scan
        this.setMode('manual');
    });
}

stopScanner() {
    if (this.scanner && typeof Quagga !== 'undefined') {
        Quagga.stop();
        this.scanner = null;
        console.log('Scanner stopped');
    }
}

quickScan() {
    this.scanMode = 'lookup';
    this.startQuickScanner();
}

startQuickScanner() {
    const modal = document.getElementById('productModal');
    const modalContent = document.getElementById('modalContent');
    
    if (modalContent) {
        modalContent.innerHTML = `
            <h2>🔍 Quick Barcode Lookup</h2>
            <div class="barcode-input">
                <input type="text" id="quickBarcodeInput" placeholder="Scan or enter barcode">
                <button class="btn btn-scanner" id="quickScanCameraBtn">📷 Scan</button>
            </div>
            <div class="camera-container" id="quickCameraContainer">
                <div id="quickCamera"></div>
            </div>
            <div id="quickResults"></div>
        `;
    }
    
    if (modal) modal.style.display = 'block';
    
    const quickScanBtn = document.getElementById('quickScanCameraBtn');
    if (quickScanBtn) {
        quickScanBtn.addEventListener('click', () => {
            this.startQuickCameraScanner();
        });
    }
    
    const quickBarcodeInput = document.getElementById('quickBarcodeInput');
    if (quickBarcodeInput) {
        quickBarcodeInput.addEventListener('input', (e) => {
            this.lookupBarcode(e.target.value);
        });
    }
}

startQuickCameraScanner() {
    const container = document.getElementById('quickCameraContainer');
    if (container) container.style.display = 'block';
    
    if (typeof Quagga === 'undefined') {
        this.showNotification('Barcode scanner library not loaded', 'error');
        return;
    }
    
    Quagga.init({
        inputStream: {
            name: "Live",
            type: "LiveStream",
            target: document.querySelector('#quickCamera'),
            constraints: {
                width: { ideal: 1280, min: 640 },
                height: { ideal: 720, min: 480 },
                facingMode: "environment"
            },
        },
        locator: {
            patchSize: "large",
            halfSample: false
        },
        numOfWorkers: 4,
        frequency: 5,
        decoder: {
            readers: [
                "code_128_reader",
                "ean_reader",
                "ean_8_reader", 
                "code_39_reader",
                "code_93_reader",
                "codabar_reader"
            ]
        },
    }, (err) => {
        if (err) {
            console.error('Quick scanner error:', err);
            return;
        }
        Quagga.start();
    });

    Quagga.onDetected((data) => {
        const barcode = data.codeResult.code;
        const confidence = data.codeResult.quality || 0;
        
        console.log('Quick scan detected:', barcode, 'confidence:', confidence);
        
        // Lower threshold for quick scan too
        if (confidence < 20) {
            return;
        }
        
        const quickBarcodeInput = document.getElementById('quickBarcodeInput');
        if (quickBarcodeInput) quickBarcodeInput.value = barcode;
        this.lookupBarcode(barcode);
        Quagga.stop();
        if (container) container.style.display = 'none';
    });
}

lookupBarcode(barcode) {
    if (!barcode) return;
    
    const product = this.products.find(p => p.barcode === barcode);
    const resultsDiv = document.getElementById('quickResults');
    
    if (!resultsDiv) return;
    
    if (product) {
        const status = this.getStockStatus(product);
        resultsDiv.innerHTML = `
            <div class="product-card">
                <div class="product-header">
                    <div class="product-name">
                        ${product.name}
                        <div class="barcode-display">📊 ${product.barcode}</div>
                    </div>
                    <span class="stock-status ${status.class}">${status.text}</span>
                </div>
                <div class="product-details">
                    <div class="detail-item">
                        <div class="detail-label">Current Stock</div>
                        <div class="detail-value">${product.currentStock}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Unit Price</div>
                        <div class="detail-value">$${product.price.toFixed(2)}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Category</div>
                        <div class="detail-value">${product.category}</div>
                    </div>
                </div>
                <div class="product-actions">
                    <button class="btn btn-small btn-success" onclick="inventoryManager.updateStock(${product.id}, 1); inventoryManager.closeModal();">
                        + Add Stock
                    </button>
                    <button class="btn btn-small btn-warning" onclick="inventoryManager.updateStock(${product.id}, -1); inventoryManager.closeModal();">
                        - Remove Stock
                    </button>
                </div>
            </div>
        `;
    } else {
        resultsDiv.innerHTML = `
            <div class="empty-state">
                <div class="icon">❌</div>
                <h3>Product Not Found</h3>
                <p>Barcode: ${barcode}</p>
                <p>This product is not in your inventory.</p>
            </div>
        `;
    }
}

closeModal() {
    const modal = document.getElementById('productModal');
    if (modal) modal.style.display = 'none';
    if (typeof Quagga !== 'undefined') {
        Quagga.stop();
    }
}

addProduct() {
    console.log('Adding product...');
    
    const barcode = document.getElementById('productBarcode')?.value || '';
    const name = document.getElementById('productName')?.value || '';
    const category = document.getElementById('category')?.value || '';
    const currentStock = parseInt(document.getElementById('currentStock')?.value || '0');
    const minStock = parseInt(document.getElementById('minStock')?.value || '0');
    const price = parseFloat(document.getElementById('price')?.value || '0');
    const supplier = document.getElementById('supplier')?.value || '';
    
    console.log('Form values:', { barcode, name, category, currentStock, minStock, price, supplier });
    
    // Validation
    if (!name) {
        this.showNotification('Please enter a product name', 'error');
        return;
    }
    
    if (!category) {
        this.showNotification('Please select a category', 'error');
        return;
    }
    
    if (isNaN(currentStock) || currentStock < 0) {
        this.showNotification('Please enter a valid current stock', 'error');
        return;
    }
    
    if (isNaN(minStock) || minStock < 0) {
        this.showNotification('Please enter a valid minimum stock', 'error');
        return;
    }
    
    if (isNaN(price) || price < 0) {
        this.showNotification('Please enter a valid price', 'error');
        return;
    }
    
    // Check if barcode already exists
    if (barcode && this.products.find(p => p.barcode === barcode)) {
        this.showNotification('A product with this barcode already exists!', 'error');
        return;
    }
    
    const product = {
        id: Date.now() + Math.random(),
        barcode: barcode || null,
        name: name,
        category: category,
        currentStock: currentStock,
        minStock: minStock,
        price: price,
        supplier: supplier,
        dateAdded: new Date().toLocaleDateString()
    };
    
    console.log('New product:', product);
    
    this.products.push(product);
    this.saveData();
    this.renderProducts();
    this.updateStats();
    
    // Reset form
    const form = document.getElementById('productForm');
    if (form) form.reset();
    const barcodeInput = document.getElementById('barcodeInput');
    if (barcodeInput) barcodeInput.value = '';
    
    this.showNotification('Product added successfully! 🎉', 'success');
    console.log('Product added successfully, total products:', this.products.length);
}

updateStock(id, change) {
    console.log('Updating stock for product ID:', id, 'change:', change);
    const product = this.products.find(p => p.id === id);
    if (product) {
        product.currentStock = Math.max(0, product.currentStock + change);
        this.saveData();
        this.renderProducts();
        this.updateStats();
        
        if (product.currentStock <= product.minStock && product.currentStock > 0) {
            this.showNotification(`⚠️ ${product.name} is running low!`, 'warning');
        } else if (product.currentStock === 0) {
            this.showNotification(`❌ ${product.name} is out of stock!`, 'error');
        }
    } else {
        console.error('Product not found with ID:', id);
    }
}

deleteProduct(id) {
    if (confirm('Are you sure you want to delete this product?')) {
        this.products = this.products.filter(p => p.id !== id);
        this.saveData();
        this.renderProducts();
        this.updateStats();
        this.showNotification('Product deleted successfully.', 'info');
    }
}

showProductInfo(id) {
    const product = this.products.find(p => p.id === id);
    if (!product) return;
    
    const modal = document.getElementById('productModal');
    const modalContent = document.getElementById('modalContent');
    const status = this.getStockStatus(product);
    
    if (modalContent) {
        modalContent.innerHTML = `
            <h2>📦 Product Information</h2>
            <div class="product-card">
                <div class="product-header">
                    <div class="product-name">
                        ${product.name}
                        ${product.barcode ? `<div class="barcode-display">📊 ${product.barcode}</div>` : ''}
                    </div>
                    <span class="stock-status ${status.class}">${status.text}</span>
                </div>
                <div class="product-details">
                    <div class="detail-item">
                        <div class="detail-label">Current Stock</div>
                        <div class="detail-value">${product.currentStock}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Minimum Stock</div>
                        <div class="detail-value">${product.minStock}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Unit Price</div>
                        <div class="detail-value">$${product.price.toFixed(2)}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Category</div>
                        <div class="detail-value">${product.category}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Supplier</div>
                        <div class="detail-value">${product.supplier || 'N/A'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Total Value</div>
                        <div class="detail-value">$${(product.currentStock * product.price).toFixed(2)}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Date Added</div>
                        <div class="detail-value">${product.dateAdded}</div>
                    </div>
                </div>
                <div class="product-actions">
                    <button class="btn btn-small btn-success" onclick="inventoryManager.updateStock(${product.id}, 1); inventoryManager.closeModal();">
                        + Add Stock
                    </button>
                    <button class="btn btn-small btn-warning" onclick="inventoryManager.updateStock(${product.id}, -1); inventoryManager.closeModal();">
                        - Remove Stock
                    </button>
                    <button class="btn btn-small btn-danger" onclick="inventoryManager.deleteProduct(${product.id}); inventoryManager.closeModal();">
                        🗑️ Delete
                    </button>
                </div>
            </div>
        `;
    }
    
    if (modal) modal.style.display = 'block';
}

getStockStatus(product) {
    if (product.currentStock === 0) return { class: 'stock-out', text: 'Out of Stock' };
    if (product.currentStock <= product.minStock) return { class: 'stock-low', text: 'Low Stock' };
    return { class: 'stock-ok', text: 'In Stock' };
}

renderProducts(productsToRender = this.products) {
    const container = document.getElementById('productList');
    if (!container) return;
    
    console.log('Rendering products:', productsToRender.length);
    
    if (productsToRender.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="icon">📦</div>
                <h3>No products found</h3>
                <p>Add new products or adjust your search</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = productsToRender.map(product => {
        const status = this.getStockStatus(product);
        const isLowStock = product.currentStock <= product.minStock;
        
        return `
            <div class="product-card ${isLowStock ? 'low-stock' : ''}">
                <div class="product-header">
                    <div class="product-name">
                        ${product.name}
                        ${product.barcode ? `<div class="barcode-display">📊 ${product.barcode}</div>` : ''}
                    </div>
                    <span class="stock-status ${status.class}">${status.text}</span>
                </div>
                
                <div class="product-details">
                    <div class="detail-item">
                        <div class="detail-label">Current Stock</div>
                        <div class="detail-value">${product.currentStock}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Min Stock</div>
                        <div class="detail-value">${product.minStock}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Unit Price</div>
                        <div class="detail-value">$${product.price.toFixed(2)}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Category</div>
                        <div class="detail-value">${product.category}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Supplier</div>
                        <div class="detail-value">${product.supplier || 'N/A'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Total Value</div>
                        <div class="detail-value">$${(product.currentStock * product.price).toFixed(2)}</div>
                    </div>
                </div>
                
                <div class="product-actions">
                    <button class="btn btn-small btn-success" onclick="inventoryManager.updateStock(${product.id}, 1)">
                        + Add
                    </button>
                    <button class="btn btn-small btn-warning" onclick="inventoryManager.updateStock(${product.id}, -1)">
                        - Sell
                    </button>
                    <button class="btn btn-small btn-info" onclick="inventoryManager.showProductInfo(${product.id})">
                        ℹ️ Info
                    </button>
                    <button class="btn btn-small btn-danger" onclick="inventoryManager.deleteProduct(${product.id})">
                        🗑️ Delete
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    console.log('Products rendered successfully');
}

updateStats() {
    const totalProducts = this.products.length;
    const lowStockItems = this.products.filter(p => p.currentStock <= p.minStock && p.currentStock > 0).length;
    const outOfStockItems = this.products.filter(p => p.currentStock === 0).length;
    const totalValue = this.products.reduce((sum, p) => sum + (p.currentStock * p.price), 0);
    
    const totalProductsEl = document.getElementById('totalProducts');
    const lowStockItemsEl = document.getElementById('lowStockItems');
    const outOfStockItemsEl = document.getElementById('outOfStockItems');
    const totalValueEl = document.getElementById('totalValue');
    
    if (totalProductsEl) totalProductsEl.textContent = totalProducts;
    if (lowStockItemsEl) lowStockItemsEl.textContent = lowStockItems;
    if (outOfStockItemsEl) outOfStockItemsEl.textContent = outOfStockItems;
    if (totalValueEl) totalValueEl.textContent = `$${totalValue.toFixed(2)}`;
    
    console.log('Stats updated:', { totalProducts, lowStockItems, outOfStockItems, totalValue });
}

searchProducts(query) {
    if (!query) {
        this.renderProducts();
        return;
    }
    
    const filtered = this.products.filter(product => 
        product.name.toLowerCase().includes(query.toLowerCase()) ||
        product.category.toLowerCase().includes(query.toLowerCase()) ||
        (product.supplier && product.supplier.toLowerCase().includes(query.toLowerCase())) ||
        (product.barcode && product.barcode.includes(query))
    );
    
    this.renderProducts(filtered);
}

showNotification(message, type = 'info') {
    console.log('Notification:', message, type);
    const notification = document.createElement('div');
    const colors = {
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#6366f1'
    };
    
    notification.style.cssText = `
        position: fixed;
        top: 24px;
        right: 24px;
        background: ${colors[type] || colors.info};
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 8px 16px rgba(0,0,0,0.15);
        z-index: 1001;
        font-weight: 500;
        max-width: 320px;
        animation: slideIn 0.3s ease-out;
        backdrop-filter: blur(8px);
    `;
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}
```

}

// Initialize app
let inventoryManager;

// Wait for DOM to be ready
document.addEventListener(‘DOMContentLoaded’, function() {
console.log(‘DOM loaded, initializing app…’);
inventoryManager = new InventoryManager();

```
// Demo data function
function addDemoData() {
    const demoProducts = [
        { 
            name: 'Kimchi', 
            category: 'Refrigerated', 
            currentStock: 15, 
            minStock: 5, 
            price: 8.99, 
            supplier: 'KFT Wholesale',
            barcode: '1234567890123'
        },
        { 
            name: 'Shin Ramyun', 
            category: 'Noodles', 
            currentStock: 2, 
            minStock: 10, 
            price: 1.50, 
            supplier: 'Korea Food Trading',
            barcode: '8801043001441'
        },
        { 
            name: 'Gochujang', 
            category: 'Seasonings', 
            currentStock: 8, 
            minStock: 3, 
            price: 4.99, 
            supplier: 'Manna Food',
            barcode: '8801056412345'
        }
    ];
    
    if (inventoryManager.products.length === 0) {
        demoProducts.forEach(product => {
            inventoryManager.products.push({
                ...product,
                id: Date.now() + Math.random(),
                dateAdded: new Date().toLocaleDateString()
            });
        });
        inventoryManager.saveData();
        inventoryManager.renderProducts();
        inventoryManager.updateStats();
        inventoryManager.showNotification('Demo data added successfully!', 'success');
    }
}

// Check for demo data on first load
setTimeout(() => {
    if (inventoryManager.products.length === 0 && confirm('First time using this app? Would you like to add some demo data?')) {
        addDemoData();
    }
}, 1000);
```

});

// Fallback initialization if DOMContentLoaded already fired
if (document.readyState === ‘loading’) {
// DOM is still loading, wait for DOMContentLoaded
} else {
// DOM is already loaded
console.log(‘DOM already loaded, initializing app immediately…’);
inventoryManager = new InventoryManager();
}
