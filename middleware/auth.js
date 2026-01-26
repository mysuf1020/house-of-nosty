// Middleware untuk cek apakah user sudah login
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    }
    req.flash('error_msg', 'Silakan login terlebih dahulu');
    res.redirect('/admin/login');
};

// Middleware untuk cek role admin
const isAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        return next();
    }
    req.flash('error_msg', 'Anda tidak memiliki akses ke halaman ini');
    res.redirect('/admin/dashboard');
};

// Middleware untuk redirect jika sudah login
const isNotAuthenticated = (req, res, next) => {
    if (!req.session.user) {
        return next();
    }
    res.redirect('/admin/dashboard');
};

module.exports = { isAuthenticated, isAdmin, isNotAuthenticated };
