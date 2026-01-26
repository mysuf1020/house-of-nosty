const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Initialize cart if not exists
const initCart = (req) => {
    if (!req.session.cart) {
        req.session.cart = [];
    }
};

// Get cart
router.get('/', (req, res) => {
    initCart(req);
    
    const cart = req.session.cart;
    const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    
    res.render('customer/cart', {
        title: 'Keranjang - House of Nosty',
        cart,
        total,
        tableNumber: req.session.tableNumber
    });
});

// Get cart data (JSON)
router.get('/data', (req, res) => {
    initCart(req);
    
    const cart = req.session.cart;
    const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const itemCount = cart.reduce((sum, item) => sum + item.qty, 0);
    
    res.json({ cart, total, itemCount });
});

// Add to cart
router.post('/add', async (req, res) => {
    try {
        initCart(req);
        
        const { productId, qty, temperature, sugar, size, notes } = req.body;
        
        // Get product from database
        const [products] = await db.query(
            'SELECT * FROM products WHERE id = ? AND is_available = 1',
            [productId]
        );
        
        if (products.length === 0) {
            return res.status(404).json({ error: 'Produk tidak tersedia' });
        }
        
        const product = products[0];
        
        // Calculate price with size option
        let finalPrice = product.price;
        if (size === 'Large' && product.has_size_option) {
            finalPrice += product.large_price_add;
        }
        
        // Build variant info string
        const variants = [];
        if (temperature) variants.push(temperature);
        if (sugar) variants.push(sugar);
        if (size) variants.push(size);
        const variantInfo = variants.join(', ');
        
        // Create cart item
        const cartItem = {
            id: Date.now(), // Unique ID for cart item
            productId: product.id,
            name: product.name,
            price: finalPrice,
            qty: parseInt(qty) || 1,
            variantInfo,
            notes: notes || '',
            image: product.image
        };
        
        req.session.cart.push(cartItem);
        
        const itemCount = req.session.cart.reduce((sum, item) => sum + item.qty, 0);
        const total = req.session.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
        
        res.json({ 
            success: true, 
            message: 'Berhasil ditambahkan ke keranjang',
            itemCount,
            total
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Terjadi kesalahan' });
    }
});

// Update cart item quantity
router.post('/update', (req, res) => {
    initCart(req);
    
    const { itemId, qty } = req.body;
    
    const itemIndex = req.session.cart.findIndex(item => item.id === parseInt(itemId));
    
    if (itemIndex === -1) {
        return res.status(404).json({ error: 'Item tidak ditemukan' });
    }
    
    if (qty <= 0) {
        req.session.cart.splice(itemIndex, 1);
    } else {
        req.session.cart[itemIndex].qty = parseInt(qty);
    }
    
    const itemCount = req.session.cart.reduce((sum, item) => sum + item.qty, 0);
    const total = req.session.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    
    res.json({ success: true, itemCount, total });
});

// Remove from cart
router.post('/remove', (req, res) => {
    initCart(req);
    
    const { itemId } = req.body;
    
    req.session.cart = req.session.cart.filter(item => item.id !== parseInt(itemId));
    
    const itemCount = req.session.cart.reduce((sum, item) => sum + item.qty, 0);
    const total = req.session.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    
    res.json({ success: true, itemCount, total });
});

// Clear cart
router.post('/clear', (req, res) => {
    req.session.cart = [];
    res.json({ success: true });
});

module.exports = router;
