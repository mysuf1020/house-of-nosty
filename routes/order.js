const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Generate order number
const generateOrderNumber = () => {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    return `NST${dateStr}${random}`;
};

// Checkout page
router.get('/checkout', (req, res) => {
    if (!req.session.cart || req.session.cart.length === 0) {
        req.flash('error_msg', 'Keranjang kosong');
        return res.redirect('/menu');
    }
    
    // Require table number from QR scan
    if (!req.session.tableNumber) {
        req.flash('error_msg', 'Silakan scan QR Code di meja Anda terlebih dahulu');
        return res.redirect('/menu');
    }
    
    const cart = req.session.cart;
    const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    
    res.render('customer/checkout', {
        title: 'Checkout - House of Nosty',
        cart,
        total,
        tableNumber: req.session.tableNumber,
        tableNumberLocked: req.session.tableNumberLocked || false
    });
});

// Process order
router.post('/place', async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { customerName, notes } = req.body;
        const cart = req.session.cart;
        
        // Use locked table number from session (from QR scan)
        const tableNumber = req.session.tableNumber;
        
        if (!cart || cart.length === 0) {
            throw new Error('Keranjang kosong');
        }
        
        if (!customerName) {
            throw new Error('Nama wajib diisi');
        }
        
        if (!tableNumber) {
            throw new Error('Silakan scan QR Code di meja Anda terlebih dahulu');
        }
        
        const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
        const orderNumber = generateOrderNumber();
        
        // Insert order
        const [orderResult] = await connection.query(
            `INSERT INTO orders (order_number, customer_name, table_number, total_price, notes, status) 
             VALUES (?, ?, ?, ?, ?, 'pending')`,
            [orderNumber, customerName, tableNumber, total, notes || null]
        );
        
        const orderId = orderResult.insertId;
        
        // Insert order items
        for (const item of cart) {
            await connection.query(
                `INSERT INTO order_items (order_id, product_id, qty, price_at_order, variant_info, notes) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [orderId, item.productId, item.qty, item.price, item.variantInfo, item.notes]
            );
        }
        
        await connection.commit();
        
        // Clear cart
        req.session.cart = [];
        
        res.render('customer/order-success', {
            title: 'Pesanan Berhasil - House of Nosty',
            orderNumber,
            customerName,
            tableNumber,
            total
        });
        
    } catch (error) {
        await connection.rollback();
        console.error(error);
        req.flash('error_msg', error.message || 'Terjadi kesalahan saat memproses pesanan');
        res.redirect('/order/checkout');
    } finally {
        connection.release();
    }
});

// Track order status
router.get('/track/:orderNumber', async (req, res) => {
    try {
        const [orders] = await db.query(
            `SELECT * FROM orders WHERE order_number = ?`,
            [req.params.orderNumber]
        );
        
        if (orders.length === 0) {
            req.flash('error_msg', 'Pesanan tidak ditemukan');
            return res.redirect('/menu');
        }
        
        const order = orders[0];
        
        const [items] = await db.query(
            `SELECT oi.*, p.name as product_name, p.image 
             FROM order_items oi 
             JOIN products p ON oi.product_id = p.id 
             WHERE oi.order_id = ?`,
            [order.id]
        );
        
        res.render('customer/order-track', {
            title: 'Status Pesanan - House of Nosty',
            order,
            items
        });
    } catch (error) {
        console.error(error);
        res.render('error', { title: 'Error', message: 'Terjadi kesalahan' });
    }
});

module.exports = router;
