# House of Nosty - E-Menu Interactive & Company Profile

Website Company Profile dan E-Menu Interactive dengan konsep Self-Service Order untuk Coffee Shop House of Nosty.

## 📋 Fitur

### Sisi Pelanggan (Mobile Web)
- ✅ Deteksi meja otomatis via QR Code (`?meja=5`)
- ✅ Navigasi kategori sticky
- ✅ Pemilihan menu dengan modal varian (Hot/Ice, Sugar Level, Size)
- ✅ Keranjang melayang (Floating Cart)
- ✅ Checkout & konfirmasi pesanan
- ✅ Tracking status pesanan

### Sisi Admin (Desktop Web)
- ✅ Login Admin
- ✅ Dashboard dengan statistik
- ✅ Kitchen Display System (KDS)
- ✅ Manajemen Menu (CRUD)
- ✅ Manajemen Kategori
- ✅ Update status pesanan
- ✅ Laporan penjualan
- ✅ Pengaturan Company Profile

## 🛠️ Teknologi

- **Backend**: Node.js + Express.js
- **Frontend**: EJS + Bootstrap 5
- **Database**: MySQL (via XAMPP)
- **Session**: express-session

## 📦 Instalasi

### 1. Prasyarat
- Node.js (v14+)
- XAMPP (MySQL)

### 2. Clone & Install Dependencies
```bash
cd house-of-nosty
npm install
```

### 3. Setup Database
1. Buka phpMyAdmin (http://localhost/phpmyadmin)
2. Import file `database/schema.sql`
3. Atau jalankan query di file tersebut secara manual

### 4. Konfigurasi Database
Edit file `config/database.js` jika diperlukan:
```javascript
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '', // Sesuaikan jika ada password
    database: 'db_nosty_gacoan'
});
```

### 5. Jalankan Server
```bash
# Development (dengan auto-reload)
npm run dev

# Production
npm start
```

### 6. Akses Website
- **Customer**: http://localhost:3000
- **Admin**: http://localhost:3000/admin/login
  - Username: `admin`
  - Password: `admin123`

## 📱 Cara Penggunaan

### Untuk Pelanggan
1. Scan QR Code di meja (atau akses `/menu?meja=5`)
2. Pilih menu yang diinginkan
3. Atur varian (suhu, gula, ukuran)
4. Tambahkan ke keranjang
5. Checkout dan tunggu pesanan diantar

### Untuk Admin/Dapur
1. Login ke `/admin/login`
2. Buka Kitchen Display untuk melihat pesanan masuk
3. Update status pesanan (Proses → Selesai)
4. Kelola menu dan kategori sesuai kebutuhan

## 📁 Struktur Folder

```
house-of-nosty/
├── app.js                 # Entry point
├── config/
│   └── database.js        # Konfigurasi MySQL
├── database/
│   └── schema.sql         # Schema & seed data
├── middleware/
│   └── auth.js            # Authentication middleware
├── public/
│   ├── css/style.css      # Custom styles
│   ├── js/main.js         # Custom scripts
│   ├── images/            # Static images
│   └── uploads/menu/      # Uploaded menu images
├── routes/
│   ├── index.js           # Homepage & company profile
│   ├── menu.js            # Menu display
│   ├── cart.js            # Shopping cart
│   ├── order.js           # Order processing
│   └── admin.js           # Admin panel
└── views/
    ├── partials/          # Reusable components
    ├── customer/          # Customer-facing pages
    ├── admin/             # Admin panel pages
    └── error.ejs          # Error page
```

## 🔐 Akun Default

| Role    | Username | Password  |
|---------|----------|-----------|
| Admin   | admin    | admin123  |
| Kitchen | kitchen  | admin123  |

## 📝 Catatan untuk Skripsi

Sistem ini dikembangkan sesuai dengan SRS (Spesifikasi Kebutuhan Sistem) untuk:
- **Judul**: Perancangan Sistem Informasi Website Company Profile dan E-Menu Interactive pada Coffee Shop House of Nosty
- **Metode**: Prototype / Waterfall
- **Arsitektur**: Monolithic dengan Server-Side Rendering (SSR)

## 📄 License

© 2024 House of Nosty. All rights reserved.
