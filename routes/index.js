const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Homepage - Company Profile
router.get('/', async (req, res) => {
    try {
        // Get company info
        const [companyRows] = await db.query('SELECT * FROM company_info');
        const company = {};
        companyRows.forEach(row => {
            company[row.key_name] = row.value;
        });

        // Get featured products (limit 6)
        const [products] = await db.query(`
            SELECT p.*, c.name as category_name 
            FROM products p 
            JOIN categories c ON p.category_id = c.id 
            WHERE p.is_available = 1 
            ORDER BY RAND() 
            LIMIT 6
        `);

        res.render('customer/home', {
            title: 'House of Nosty - Coffee Shop',
            company,
            products
        });
    } catch (error) {
        console.error(error);
        res.render('error', { title: 'Error', message: 'Terjadi kesalahan' });
    }
});

// About Page
router.get('/about', async (req, res) => {
    try {
        const [companyRows] = await db.query('SELECT * FROM company_info');
        const company = {};
        companyRows.forEach(row => {
            company[row.key_name] = row.value;
        });

        res.render('customer/about', {
            title: 'Tentang Kami - House of Nosty',
            company
        });
    } catch (error) {
        console.error(error);
        res.render('error', { title: 'Error', message: 'Terjadi kesalahan' });
    }
});

// Contact Page
router.get('/contact', async (req, res) => {
    try {
        const [companyRows] = await db.query('SELECT * FROM company_info');
        const company = {};
        companyRows.forEach(row => {
            company[row.key_name] = row.value;
        });

        res.render('customer/contact', {
            title: 'Kontak - House of Nosty',
            company
        });
    } catch (error) {
        console.error(error);
        res.render('error', { title: 'Error', message: 'Terjadi kesalahan' });
    }
});

// Set Table Number from QR Code
router.get('/scan', (req, res) => {
    const { meja } = req.query;
    
    if (meja) {
        req.session.tableNumber = meja;
        req.flash('success_msg', `Meja ${meja} berhasil terdeteksi!`);
    }
    
    res.redirect('/menu');
});

module.exports = router;
