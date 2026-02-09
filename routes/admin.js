const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const QRCode = require('qrcode');
const db = require('../config/database');
const { isAuthenticated, isAdmin, isKasirOrAdmin, isStaff, isNotAuthenticated } = require('../middleware/auth');

// Helper function to log activity
async function logActivity(userId, action, description, orderId = null) {
    try {
        await db.query(
            'INSERT INTO activity_logs (user_id, action, description, order_id) VALUES (?, ?, ?, ?)',
            [userId, action, description, orderId]
        );
    } catch (error) {
        console.error('Error logging activity:', error);
    }
}

// Helper function to record staff shift
async function recordShift(userId) {
    try {
        const today = new Date().toISOString().split('T')[0];
        await db.query(
            'INSERT IGNORE INTO staff_shifts (user_id, shift_date) VALUES (?, ?)',
            [userId, today]
        );
    } catch (error) {
        console.error('Error recording shift:', error);
    }
}

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
        
        // Record shift and log activity
        await recordShift(user.id);
        await logActivity(user.id, 'LOGIN', `${user.full_name} (${user.role}) login ke sistem`);
        
        req.flash('success_msg', 'Login berhasil!');
        res.redirect('/admin/dashboard');
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Terjadi kesalahan');
        res.redirect('/admin/login');
    }
});

// Logout
router.get('/logout', async (req, res) => {
    if (req.session.user) {
        await logActivity(req.session.user.id, 'LOGOUT', `${req.session.user.fullName} logout dari sistem`);
    }
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
             WHERE status IN ('pending', 'paid', 'cooking') 
             ORDER BY 
                CASE status 
                    WHEN 'pending' THEN 1 
                    WHEN 'paid' THEN 2
                    WHEN 'cooking' THEN 3 
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
        
        // Get order info for logging
        const [orders] = await db.query('SELECT order_number, status as old_status FROM orders WHERE id = ?', [req.params.id]);
        const order = orders[0];
        
        await db.query(
            'UPDATE orders SET status = ? WHERE id = ?',
            [status, req.params.id]
        );
        
        // Log activity
        const statusLabels = { pending: 'Pending', paid: 'Lunas', cooking: 'Masak', served: 'Antar', cancelled: 'Batal' };
        await logActivity(
            req.session.user.id, 
            'UPDATE_STATUS', 
            `${req.session.user.fullName} mengubah status pesanan #${order.order_number} dari ${statusLabels[order.old_status]} ke ${statusLabels[status]}`,
            req.params.id
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
             GROUP BY status`,
            params
        );
        
        // Get today's active staff
        const today = new Date().toISOString().split('T')[0];
        const [todayShifts] = await db.query(
            `SELECT ss.*, u.full_name, u.role 
             FROM staff_shifts ss 
             JOIN users u ON ss.user_id = u.id 
             WHERE ss.shift_date = ?
             ORDER BY ss.check_in DESC`,
            [today]
        );
        
        res.render('admin/reports', {
            title: 'Laporan - Admin House of Nosty',
            summary: summary[0],
            topProducts,
            ordersByStatus,
            todayShifts,
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

// ==================== USER MANAGEMENT ====================

router.get('/users', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const [users] = await db.query(
            'SELECT id, username, full_name, role, is_active, created_at FROM users ORDER BY role, full_name'
        );
        
        // Get today's active staff
        const today = new Date().toISOString().split('T')[0];
        const [todayShifts] = await db.query(
            `SELECT ss.*, u.full_name, u.role 
             FROM staff_shifts ss 
             JOIN users u ON ss.user_id = u.id 
             WHERE ss.shift_date = ?
             ORDER BY ss.check_in DESC`,
            [today]
        );
        
        res.render('admin/users', {
            title: 'Kelola User - Admin House of Nosty',
            users,
            todayShifts
        });
    } catch (error) {
        console.error(error);
        res.render('error', { title: 'Error', message: 'Terjadi kesalahan' });
    }
});

// Add user
router.post('/users/add', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { username, password, full_name, role } = req.body;
        
        // Check if username exists
        const [existing] = await db.query('SELECT id FROM users WHERE username = ?', [username]);
        if (existing.length > 0) {
            req.flash('error_msg', 'Username sudah digunakan');
            return res.redirect('/admin/users');
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.query(
            'INSERT INTO users (username, password, full_name, role) VALUES (?, ?, ?, ?)',
            [username, hashedPassword, full_name, role]
        );
        
        await logActivity(req.session.user.id, 'ADD_USER', `${req.session.user.fullName} menambahkan user baru: ${full_name} (${role})`);
        
        req.flash('success_msg', 'User berhasil ditambahkan');
        res.redirect('/admin/users');
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Terjadi kesalahan');
        res.redirect('/admin/users');
    }
});

// Edit user
router.post('/users/edit/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { full_name, role, is_active, password } = req.body;
        
        if (password && password.trim() !== '') {
            const hashedPassword = await bcrypt.hash(password, 10);
            await db.query(
                'UPDATE users SET full_name = ?, role = ?, is_active = ?, password = ? WHERE id = ?',
                [full_name, role, is_active ? 1 : 0, hashedPassword, req.params.id]
            );
        } else {
            await db.query(
                'UPDATE users SET full_name = ?, role = ?, is_active = ? WHERE id = ?',
                [full_name, role, is_active ? 1 : 0, req.params.id]
            );
        }
        
        await logActivity(req.session.user.id, 'EDIT_USER', `${req.session.user.fullName} mengubah data user ID ${req.params.id}`);
        
        req.flash('success_msg', 'User berhasil diperbarui');
        res.redirect('/admin/users');
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Terjadi kesalahan');
        res.redirect('/admin/users');
    }
});

// Delete user
router.post('/users/delete/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
        // Prevent deleting self
        if (parseInt(req.params.id) === req.session.user.id) {
            req.flash('error_msg', 'Tidak dapat menghapus akun sendiri');
            return res.redirect('/admin/users');
        }
        
        await db.query('DELETE FROM users WHERE id = ?', [req.params.id]);
        await logActivity(req.session.user.id, 'DELETE_USER', `${req.session.user.fullName} menghapus user ID ${req.params.id}`);
        
        req.flash('success_msg', 'User berhasil dihapus');
        res.redirect('/admin/users');
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Terjadi kesalahan');
        res.redirect('/admin/users');
    }
});

// ==================== ACTIVITY LOGS ====================

router.get('/logs', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { date, user_id } = req.query;
        
        let query = `SELECT al.*, u.full_name, u.role 
                     FROM activity_logs al 
                     JOIN users u ON al.user_id = u.id 
                     WHERE 1=1`;
        const params = [];
        
        if (date) {
            query += ' AND DATE(al.created_at) = ?';
            params.push(date);
        } else {
            query += ' AND DATE(al.created_at) = CURDATE()';
        }
        
        if (user_id) {
            query += ' AND al.user_id = ?';
            params.push(user_id);
        }
        
        query += ' ORDER BY al.created_at DESC LIMIT 100';
        
        const [logs] = await db.query(query, params);
        const [users] = await db.query('SELECT id, full_name, role FROM users ORDER BY full_name');
        
        res.render('admin/logs', {
            title: 'Log Aktivitas - Admin House of Nosty',
            logs,
            users,
            filters: { date, user_id }
        });
    } catch (error) {
        console.error(error);
        res.render('error', { title: 'Error', message: 'Terjadi kesalahan' });
    }
});

// ==================== QR CODE MANAGEMENT ====================

// QR Code generator page
router.get('/qrcodes', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const totalTables = 20; // Default 20 meja
        const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
        
        const tables = [];
        for (let i = 1; i <= totalTables; i++) {
            const menuUrl = `${baseUrl}/menu?meja=${i}`;
            const qrDataUrl = await QRCode.toDataURL(menuUrl, {
                width: 300,
                margin: 2,
                color: { dark: '#000000', light: '#ffffff' }
            });
            tables.push({
                number: i,
                url: menuUrl,
                qrCode: qrDataUrl
            });
        }
        
        res.render('admin/qrcodes', {
            title: 'QR Code Meja - Admin House of Nosty',
            tables,
            baseUrl
        });
    } catch (error) {
        console.error(error);
        res.render('error', { title: 'Error', message: 'Terjadi kesalahan' });
    }
});

// Generate single QR code as image download
router.get('/qrcodes/:tableNumber/download', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const tableNumber = req.params.tableNumber;
        const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
        const menuUrl = `${baseUrl}/menu?meja=${tableNumber}`;
        
        const qrBuffer = await QRCode.toBuffer(menuUrl, {
            width: 500,
            margin: 2,
            color: { dark: '#000000', light: '#ffffff' }
        });
        
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Content-Disposition', `attachment; filename=qr-meja-${tableNumber}.png`);
        res.send(qrBuffer);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Gagal generate QR code' });
    }
});

// ==================== RESERVATION MANAGEMENT ====================

// List reservations
router.get('/reservations', isAuthenticated, isKasirOrAdmin, async (req, res) => {
    try {
        const { status } = req.query;
        let query = 'SELECT r.*, u.full_name as approved_by_name FROM reservations r LEFT JOIN users u ON r.approved_by = u.id';
        const params = [];
        
        if (status && status !== 'all') {
            query += ' WHERE r.status = ?';
            params.push(status);
        }
        
        query += ' ORDER BY FIELD(r.status, "pending", "approved", "rejected", "completed", "cancelled"), r.reservation_date ASC, r.reservation_time ASC';
        
        const [reservations] = await db.query(query, params);
        const [pendingRows] = await db.query('SELECT COUNT(*) as count FROM reservations WHERE status = "pending"');
        
        res.render('admin/reservations', {
            title: 'Kelola Reservasi - Admin House of Nosty',
            reservations,
            pendingCount: pendingRows[0].count,
            filter: status || 'all'
        });
    } catch (error) {
        console.error(error);
        res.render('error', { title: 'Error', message: 'Terjadi kesalahan' });
    }
});

// Update reservation status (approve/reject/complete)
router.post('/reservations/:id/status', isAuthenticated, isKasirOrAdmin, async (req, res) => {
    try {
        const { status, adminNotes } = req.body;
        const validStatuses = ['approved', 'rejected', 'cancelled', 'completed'];
        
        if (!validStatuses.includes(status)) {
            req.flash('error_msg', 'Status tidak valid');
            return res.redirect('/admin/reservations');
        }
        
        // Get reservation info for logging
        const [rows] = await db.query('SELECT * FROM reservations WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            req.flash('error_msg', 'Reservasi tidak ditemukan');
            return res.redirect('/admin/reservations');
        }
        const reservation = rows[0];
        
        await db.query(
            'UPDATE reservations SET status = ?, admin_notes = ?, approved_by = ? WHERE id = ?',
            [status, adminNotes || reservation.admin_notes, req.session.user.id, req.params.id]
        );
        
        // Log activity
        const statusLabels = { approved: 'Disetujui', rejected: 'Ditolak', cancelled: 'Dibatalkan', completed: 'Selesai' };
        await logActivity(
            req.session.user.id,
            'UPDATE_RESERVATION',
            `${req.session.user.fullName} mengubah status reservasi ${reservation.customer_name} (${reservation.phone}) menjadi ${statusLabels[status]}`
        );
        
        req.flash('success_msg', `Reservasi ${reservation.customer_name} berhasil di-${statusLabels[status].toLowerCase()}`);
        res.redirect('/admin/reservations');
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Terjadi kesalahan');
        res.redirect('/admin/reservations');
    }
});

module.exports = router;
