const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Reservation form page
router.get('/', (req, res) => {
    res.render('customer/reservation', {
        title: 'Reservasi - House of Nosty'
    });
});

// Submit reservation
router.post('/', async (req, res) => {
    try {
        const { customerName, phone, reservationDate, reservationTime, guestCount, notes } = req.body;
        
        if (!customerName || !phone || !reservationDate || !reservationTime || !guestCount) {
            req.flash('error_msg', 'Semua field wajib diisi');
            return res.redirect('/reservation');
        }
        
        // Validate date is not in the past
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const resDate = new Date(reservationDate);
        if (resDate < today) {
            req.flash('error_msg', 'Tanggal reservasi tidak boleh di masa lalu');
            return res.redirect('/reservation');
        }
        
        await db.query(
            `INSERT INTO reservations (customer_name, phone, reservation_date, reservation_time, guest_count, notes) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [customerName, phone, reservationDate, reservationTime, guestCount, notes || null]
        );
        
        req.flash('success_msg', 'Reservasi berhasil dikirim! Mohon tunggu konfirmasi dari kami via WhatsApp/telepon.');
        res.redirect('/reservation/status?phone=' + encodeURIComponent(phone));
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Terjadi kesalahan saat mengirim reservasi');
        res.redirect('/reservation');
    }
});

// Check reservation status by phone
router.get('/status', async (req, res) => {
    try {
        const { phone } = req.query;
        let reservations = [];
        
        if (phone) {
            const [rows] = await db.query(
                `SELECT * FROM reservations WHERE phone = ? ORDER BY created_at DESC LIMIT 10`,
                [phone]
            );
            reservations = rows;
        }
        
        res.render('customer/reservation-status', {
            title: 'Status Reservasi - House of Nosty',
            reservations,
            phone: phone || ''
        });
    } catch (error) {
        console.error(error);
        res.render('error', { title: 'Error', message: 'Terjadi kesalahan' });
    }
});

module.exports = router;
