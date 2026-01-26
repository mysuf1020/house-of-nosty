# House of Nosty

Sistem E-Menu dan Company Profile buat Coffee Shop House of Nosty. Dibuat pake Node.js, Express, MySQL.

## Demo

🌐 **Live**: https://house-of-nosty-production.up.railway.app

## Fitur

**Customer:**
- Scan QR meja langsung order
- Pilih varian (hot/ice, gula, size)
- Cart + checkout
- Track pesanan realtime

**Admin:**
- Dashboard + laporan
- Kitchen display buat dapur
- Kelola menu & kategori
- User management (admin/kasir/kitchen)
- Activity log

## Tech Stack

- Node.js + Express
- EJS + Bootstrap 5
- MySQL
- Deploy di Railway

## Install Local

```bash
# clone repo
git clone https://github.com/mysuf1020/house-of-nosty.git
cd house-of-nosty

# install
npm install

# setup database - import schema.sql ke MySQL

# jalanin
npm run dev
```

Buka http://localhost:3000

## Login

| User | Password | Role |
|------|----------|------|
| admin | admin123 | Admin |
| kasir1 | admin123 | Kasir |
| kitchen1 | admin123 | Kitchen |

## Struktur

```
├── app.js
├── config/
│   ├── database.js
│   └── seeder.js
├── routes/
│   ├── admin.js
│   ├── menu.js
│   ├── cart.js
│   └── order.js
├── views/
│   ├── admin/
│   └── customer/
└── public/
```

## Status Order

```
PENDING → LUNAS → MASAK → ANTAR
```

## Notes

Project ini dibuat untuk tugas akhir/skripsi:
- **Judul**: Perancangan Sistem Informasi Website Company Profile dan E-Menu Interactive pada Coffee Shop House of Nosty
- **Metode**: Prototype
- **Stack**: Node.js + MySQL (Monolithic SSR)

---

© 2024 House of Nosty
