const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const db = require('../config/database');
const { isAuthenticated, isAdmin, isNotAuthenticated } = require('../middleware/auth');

// Multer config for image upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/menu');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Hanya file gambar yang diperbolehkan'));
    },
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// ==================== AUTH ====================

// Login page
router.get('/login', isNotAuthenticated, (req, res) => {
    res.render('admin/login', { title: 'Login Admin - House of Nosty' });
});

// Login process
router.post('/login', isNotAuthenticated, async (req, res) => {
    try {
        const { username, password } = req.body;
        
        const [users] = await db.query(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );
        
        if (users.length === 0) {
            req.flash('error_msg', 'Username atau password salah');
            return res.redirect('/admin/login');
        }
        
        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password);
        
        if (!isMatch) {
            req.flash('error_msg', 'Username atau password salah');
            return res.redirect('/admin/login');
        }
        
        req.session.user = {
            id: user.id,
            username: user.username,
            fullName: user.full_name,
            role: user.role
        };
        
        req.flash('success_msg', 'Login berhasil!');
        res.redirect('/admin/dashboard');
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Terjadi kesalahan');
        res.redirect('/admin/login');
    }
});

// Logout
router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/admin/login');
});

// ==================== DASHBOARD ====================

router.get('/dashboard', isAuthenticated, async (req, res) => {
    try {
        // Get statistics
        const [todayOrders] = await db.query(
            `SELECT COUNT(*) as count, COALESCE(SUM(total_price), 0) as revenue 
             FROM orders WHERE DATE(created_at) = CURDATE()`
        );
        
        const [pendingOrders] = await db.query(
            `SELECT COUNT(*) as count FROM orders WHERE status = 'pending'`
        );
        
        const [totalProducts] = await db.query(
            `SELECT COUNT(*) as count FROM products`
        );
        
        const [recentOrders] = await db.query(
            `SELECT * FROM orders ORDER BY created_at DESC LIMIT 5`
        );
        
        res.render('admin/dashboard', {
            title: 'Dashboard - Admin House of Nosty',
            stats: {
                todayOrders: todayOrders[0].count,
                todayRevenue: todayOrders[0].revenue,
                pendingOrders: pendingOrders[0].count,
                totalProducts: totalProducts[0].count
            },
            recentOrders
        });
    } catch (error) {
        console.error(error);
        res.render('error', { title: 'Error', message: 'Terjadi kesalahan' });
    }
});

// ==================== KITCHEN DISPLAY ====================

router.get('/kitchen', isAuthenticated, async (req, res) => {
    try {
        const [orders] = await db.query(
            `SELECT * FROM orders 
             WHERE status IN ('pending', 'cooking') 
             ORDER BY 
                CASE status 
                    WHEN 'pending' THEN 1 
                    WHEN 'cooking' THEN 2 
                END,
                created_at ASC`
        );
        
        // Get items for each order
        for (let order of orders) {
            const [items] = await db.query(
                `SELECT oi.*, p.name as product_name 
                 FROM order_items oi 
                 JOIN products p ON oi.product_id = p.id 
                 WHERE oi.order_id = ?`,
                [order.id]
            );
            order.items = items;
        }
        
        res.render('admin/kitchen', {
            title: 'Kitchen Display - House of Nosty',
            orders
        });
    } catch (error) {
        console.error(error);
        res.render('error', { title: 'Error', message: 'Terjadi kesalahan' });
    }
});

// Update order status
router.post('/orders/:id/status', isAuthenticated, async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['pending', 'cooking', 'served', 'paid', 'cancelled'];
        
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Status tidak valid' });
        }
        
        await db.query(
            'UPDATE orders SET status = ? WHERE id = ?',
            [status, req.params.id]
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Terjadi kesalahan' });
    }
});

// ==================== ORDERS MANAGEMENT ====================

router.get('/orders', isAuthenticated, async (req, res) => {
    try {
        const { status, date } = req.query;
        
        let query = 'SELECT * FROM orders WHERE 1=1';
        const params = [];
        
        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }
        
        if (date) {
            query += ' AND DATE(created_at) = ?';
            params.push(date);
        }
        
        query += ' ORDER BY created_at DESC';
        
        const [orders] = await db.query(query, params);
        
        res.render('admin/orders', {
            title: 'Pesanan - Admin House of Nosty',
            orders,
            filters: { status, date }
        });
    } catch (error) {
        console.error(error);
        res.render('error', { title: 'Error', message: 'Terjadi kesalahan' });
    }
});

// Order detail
router.get('/orders/:id', isAuthenticated, async (req, res) => {
    try {
        const [orders] = await db.query(
            'SELECT * FROM orders WHERE id = ?',
            [req.params.id]
        );
        
        if (orders.length === 0) {
            req.flash('error_msg', 'Pesanan tidak ditemukan');
            return res.redirect('/admin/orders');
        }
        
        const [items] = await db.query(
            `SELECT oi.*, p.name as product_name, p.image 
             FROM order_items oi 
             JOIN products p ON oi.product_id = p.id 
             WHERE oi.order_id = ?`,
            [req.params.id]
        );
        
        res.render('admin/order-detail', {
            title: 'Detail Pesanan - Admin House of Nosty',
            order: orders[0],
            items
        });
    } catch (error) {
        console.error(error);
        res.render('error', { title: 'Error', message: 'Terjadi kesalahan' });
    }
});

// ==================== PRODUCTS MANAGEMENT ====================

router.get('/products', isAuthenticated, async (req, res) => {
    try {
        const [products] = await db.query(
            `SELECT p.*, c.name as category_name 
             FROM products p 
             JOIN categories c ON p.category_id = c.id 
             ORDER BY c.sort_order, p.name`
        );
        
        const [categories] = await db.query('SELECT * FROM categories ORDER BY sort_order');
        
        res.render('admin/products', {
            title: 'Kelola Menu - Admin House of Nosty',
            products,
            categories
        });
    } catch (error) {
        console.error(error);
        res.render('error', { title: 'Error', message: 'Terjadi kesalahan' });
    }
});

// Add product form
router.get('/products/add', isAuthenticated, async (req, res) => {
    try {
        const [categories] = await db.query('SELECT * FROM categories ORDER BY sort_order');
        
        res.render('admin/product-form', {
            title: 'Tambah Menu - Admin House of Nosty',
            product: null,
            categories
        });
    } catch (error) {
        console.error(error);
        res.render('error', { title: 'Error', message: 'Terjadi kesalahan' });
    }
});

// Add product process
router.post('/products/add', isAuthenticated, upload.single('image'), async (req, res) => {
    try {
        const { 
            category_id, name, price, description, 
            has_temperature_option, has_sugar_option, has_size_option, large_price_add 
        } = req.body;
        
        const image = req.file ? req.file.filename : 'default-menu.jpg';
        
        await db.query(
            `INSERT INTO products 
             (category_id, name, price, description, image, has_temperature_option, has_sugar_option, has_size_option, large_price_add) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                category_id, name, price, description, image,
                has_temperature_option ? 1 : 0,
                has_sugar_option ? 1 : 0,
                has_size_option ? 1 : 0,
                large_price_add || 5000
            ]
        );
        
        req.flash('success_msg', 'Menu berhasil ditambahkan');
        res.redirect('/admin/products');
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Terjadi kesalahan');
        res.redirect('/admin/products/add');
    }
});

// Edit product form
router.get('/products/edit/:id', isAuthenticated, async (req, res) => {
    try {
        const [products] = await db.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
        const [categories] = await db.query('SELECT * FROM categories ORDER BY sort_order');
        
        if (products.length === 0) {
            req.flash('error_msg', 'Menu tidak ditemukan');
            return res.redirect('/admin/products');
        }
        
        res.render('admin/product-form', {
            title: 'Edit Menu - Admin House of Nosty',
            product: products[0],
            categories
        });
    } catch (error) {
        console.error(error);
        res.render('error', { title: 'Error', message: 'Terjadi kesalahan' });
    }
});

// Edit product process
router.post('/products/edit/:id', isAuthenticated, upload.single('image'), async (req, res) => {
    try {
        const { 
            category_id, name, price, description, 
            has_temperature_option, has_sugar_option, has_size_option, large_price_add 
        } = req.body;
        
        let query = `UPDATE products SET 
            category_id = ?, name = ?, price = ?, description = ?,
            has_temperature_option = ?, has_sugar_option = ?, has_size_option = ?, large_price_add = ?`;
        
        const params = [
            category_id, name, price, description,
            has_temperature_option ? 1 : 0,
            has_sugar_option ? 1 : 0,
            has_size_option ? 1 : 0,
            large_price_add || 5000
        ];
        
        if (req.file) {
            query += ', image = ?';
            params.push(req.file.filename);
        }
        
        query += ' WHERE id = ?';
        params.push(req.params.id);
        
        await db.query(query, params);
        
        req.flash('success_msg', 'Menu berhasil diperbarui');
        res.redirect('/admin/products');
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Terjadi kesalahan');
        res.redirect('/admin/products/edit/' + req.params.id);
    }
});

// Toggle product availability
router.post('/products/:id/toggle', isAuthenticated, async (req, res) => {
    try {
        await db.query(
            'UPDATE products SET is_available = NOT is_available WHERE id = ?',
            [req.params.id]
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Terjadi kesalahan' });
    }
});

// Delete product
router.post('/products/:id/delete', isAuthenticated, async (req, res) => {
    try {
        await db.query('DELETE FROM products WHERE id = ?', [req.params.id]);
        
        req.flash('success_msg', 'Menu berhasil dihapus');
        res.redirect('/admin/products');
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Terjadi kesalahan');
        res.redirect('/admin/products');
    }
});

// ==================== CATEGORIES MANAGEMENT ====================

router.get('/categories', isAuthenticated, async (req, res) => {
    try {
        const [categories] = await db.query('SELECT * FROM categories ORDER BY sort_order');
        
        res.render('admin/categories', {
            title: 'Kelola Kategori - Admin House of Nosty',
            categories
        });
    } catch (error) {
        console.error(error);
        res.render('error', { title: 'Error', message: 'Terjadi kesalahan' });
    }
});

// Add category
router.post('/categories/add', isAuthenticated, async (req, res) => {
    try {
        const { name, icon, sort_order } = req.body;
        
        await db.query(
            'INSERT INTO categories (name, icon, sort_order) VALUES (?, ?, ?)',
            [name, icon || 'fa-tag', sort_order || 0]
        );
        
        req.flash('success_msg', 'Kategori berhasil ditambahkan');
        res.redirect('/admin/categories');
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Terjadi kesalahan');
        res.redirect('/admin/categories');
    }
});

// Edit category
router.post('/categories/edit/:id', isAuthenticated, async (req, res) => {
    try {
        const { name, icon, sort_order, is_active } = req.body;
        
        await db.query(
            'UPDATE categories SET name = ?, icon = ?, sort_order = ?, is_active = ? WHERE id = ?',
            [name, icon, sort_order, is_active ? 1 : 0, req.params.id]
        );
        
        req.flash('success_msg', 'Kategori berhasil diperbarui');
        res.redirect('/admin/categories');
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Terjadi kesalahan');
        res.redirect('/admin/categories');
    }
});

// ==================== REPORTS ====================

router.get('/reports', isAuthenticated, async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        
        let dateFilter = 'DATE(created_at) = CURDATE()';
        const params = [];
        
        if (start_date && end_date) {
            dateFilter = 'DATE(created_at) BETWEEN ? AND ?';
            params.push(start_date, end_date);
        }
        
        // Daily summary
        const [summary] = await db.query(
            `SELECT 
                COUNT(*) as total_orders,
                COALESCE(SUM(total_price), 0) as total_revenue,
                COALESCE(AVG(total_price), 0) as avg_order_value
             FROM orders 
             WHERE ${dateFilter} AND status = 'paid'`,
            params
        );
        
        // Top products
        const [topProducts] = await db.query(
            `SELECT p.name, SUM(oi.qty) as total_sold, SUM(oi.qty * oi.price_at_order) as revenue
             FROM order_items oi
             JOIN products p ON oi.product_id = p.id
             JOIN orders o ON oi.order_id = o.id
             WHERE ${dateFilter.replace('created_at', 'o.created_at')} AND o.status = 'paid'
             GROUP BY p.id
             ORDER BY total_sold DESC
             LIMIT 10`,
            params
        );
        
        // Orders by status
        const [ordersByStatus] = await db.query(
            `SELECT status, COUNT(*) as count
             FROM orders
             WHERE ${dateFilter}
             GROUP BY status`
        );
        
        res.render('admin/reports', {
            title: 'Laporan - Admin House of Nosty',
            summary: summary[0],
            topProducts,
            ordersByStatus,
            filters: { start_date, end_date }
        });
    } catch (error) {
        console.error(error);
        res.render('error', { title: 'Error', message: 'Terjadi kesalahan' });
    }
});

// ==================== SETTINGS ====================

router.get('/settings', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const [companyRows] = await db.query('SELECT * FROM company_info');
        const company = {};
        companyRows.forEach(row => {
            company[row.key_name] = row.value;
        });
        
        res.render('admin/settings', {
            title: 'Pengaturan - Admin House of Nosty',
            company
        });
    } catch (error) {
        console.error(error);
        res.render('error', { title: 'Error', message: 'Terjadi kesalahan' });
    }
});

// Update settings
router.post('/settings', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const fields = ['name', 'tagline', 'description', 'address', 'phone', 'email', 'instagram', 'opening_hours', 'wifi_password'];
        
        for (const field of fields) {
            if (req.body[field] !== undefined) {
                await db.query(
                    'INSERT INTO company_info (key_name, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = ?',
                    [field, req.body[field], req.body[field]]
                );
            }
        }
        
        req.flash('success_msg', 'Pengaturan berhasil disimpan');
        res.redirect('/admin/settings');
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Terjadi kesalahan');
        res.redirect('/admin/settings');
    }
});

module.exports = router;
