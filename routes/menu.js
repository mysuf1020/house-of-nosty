const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Menu Page - Customer View
router.get('/', async (req, res) => {
    try {
        // Check for table number from QR - lock it in session
        const { meja } = req.query;
        if (meja) {
            req.session.tableNumber = meja;
            req.session.tableNumberLocked = true; // Lock table number from QR
        }
        
        // If no table number set, redirect to table selection or show warning
        if (!req.session.tableNumber) {
            req.session.tableNumber = null;
            req.session.tableNumberLocked = false;
        }

        // Get all categories
        const [categories] = await db.query(
            'SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order'
        );

        // Get all available products grouped by category
        const [products] = await db.query(`
            SELECT p.*, c.name as category_name 
            FROM products p 
            JOIN categories c ON p.category_id = c.id 
            WHERE c.is_active = 1
            ORDER BY c.sort_order, p.name
        `);

        // Group products by category
        const menuByCategory = {};
        categories.forEach(cat => {
            menuByCategory[cat.id] = {
                category: cat,
                items: products.filter(p => p.category_id === cat.id)
            };
        });

        res.render('customer/menu', {
            title: 'Menu - House of Nosty',
            categories,
            menuByCategory,
            tableNumber: req.session.tableNumber,
            tableNumberLocked: req.session.tableNumberLocked || false
        });
    } catch (error) {
        console.error(error);
        res.render('error', { title: 'Error', message: 'Terjadi kesalahan saat memuat menu' });
    }
});

// Get single product detail (for modal)
router.get('/product/:id', async (req, res) => {
    try {
        const [products] = await db.query(
            'SELECT * FROM products WHERE id = ?',
            [req.params.id]
        );

        if (products.length === 0) {
            return res.status(404).json({ error: 'Produk tidak ditemukan' });
        }

        res.json(products[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Terjadi kesalahan' });
    }
});

module.exports = router;
