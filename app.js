const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');
const seedDatabase = require('./config/seeder');

const app = express();

// View Engine Setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Trust proxy for Railway/Heroku
app.set('trust proxy', 1);

// Session Configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'house-of-nosty-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        secure: false, // Set false for Railway compatibility
        httpOnly: true,
        sameSite: 'lax'
    }
}));

// Flash Messages
app.use(flash());

// Global Variables Middleware
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.user = req.session.user || null;
    res.locals.cart = req.session.cart || [];
    res.locals.tableNumber = req.session.tableNumber || null;
    next();
});

// Routes
const indexRoutes = require('./routes/index');
const menuRoutes = require('./routes/menu');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/order');
const adminRoutes = require('./routes/admin');

app.use('/', indexRoutes);
app.use('/menu', menuRoutes);
app.use('/cart', cartRoutes);
app.use('/order', orderRoutes);
app.use('/admin', adminRoutes);

// 404 Handler
app.use((req, res) => {
    res.status(404).render('error', { 
        title: 'Halaman Tidak Ditemukan',
        message: 'Maaf, halaman yang Anda cari tidak ditemukan.' 
    });
});

// Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('error', { 
        title: 'Terjadi Kesalahan',
        message: 'Maaf, terjadi kesalahan pada server.' 
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    console.log(`🚀 House of Nosty Server berjalan di http://localhost:${PORT}`);
    
    // Auto seed database on startup
    await seedDatabase();
});
