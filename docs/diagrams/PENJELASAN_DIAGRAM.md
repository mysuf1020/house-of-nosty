# Penjelasan Diagram Sistem
## House of Nosty - E-Menu Interactive & Company Profile

Dokumen ini menjelaskan setiap diagram yang digunakan dalam perancangan sistem informasi website House of Nosty.

---

## 1. ERD (Entity Relationship Diagram)

**File:** `erd.mmd` | **Gambar:** `images/erd.png`

### Deskripsi
ERD menggambarkan struktur database dan relasi antar tabel dalam sistem e-menu House of Nosty.

### Entitas dan Atribut

| Entitas | Deskripsi | Atribut Utama |
|---------|-----------|---------------|
| **USERS** | Menyimpan data pengguna admin dan kitchen | id, username, password, full_name, role |
| **CATEGORIES** | Kategori menu (Kopi, Non-Kopi, Makanan, Snack) | id, name, icon, sort_order, is_active |
| **PRODUCTS** | Data menu/produk yang dijual | id, category_id, name, price, description, image, variant options |
| **ORDERS** | Transaksi pesanan pelanggan | id, order_number, customer_name, table_number, total_price, status |
| **ORDER_ITEMS** | Detail item dalam setiap pesanan | id, order_id, product_id, qty, price_at_order, variant_info |
| **COMPANY_INFO** | Informasi company profile | id, key_name, value |

### Relasi
- **CATEGORIES → PRODUCTS**: One-to-Many (1 kategori memiliki banyak produk)
- **ORDERS → ORDER_ITEMS**: One-to-Many (1 pesanan memiliki banyak item)
- **PRODUCTS → ORDER_ITEMS**: One-to-Many (1 produk bisa ada di banyak pesanan)

---

## 2. Use Case Diagram

**File:** `use-case.mmd` | **Gambar:** `images/use-case.png`

### Deskripsi
Use Case Diagram menggambarkan interaksi antara aktor (pengguna) dengan sistem.

### Aktor

| Aktor | Deskripsi |
|-------|-----------|
| **Pelanggan** | Pengunjung coffee shop yang memesan via mobile web |
| **Admin** | Pengelola sistem dengan akses penuh |
| **Kitchen** | Staff dapur yang memproses pesanan |

### Use Case - Pelanggan
1. **UC-01**: Scan QR Code Meja
2. **UC-02**: Lihat Menu
3. **UC-03**: Pilih Varian Menu (Hot/Ice, Sugar Level, Size)
4. **UC-04**: Tambah ke Keranjang
5. **UC-05**: Lihat Keranjang
6. **UC-06**: Checkout Pesanan
7. **UC-07**: Lacak Status Pesanan
8. **UC-08**: Lihat Company Profile

### Use Case - Admin
1. **UC-09**: Login Admin
2. **UC-10**: Lihat Dashboard
3. **UC-11**: Kelola Menu/Produk (CRUD)
4. **UC-12**: Kelola Kategori
5. **UC-13**: Kelola Pesanan
6. **UC-14**: Lihat Laporan Penjualan
7. **UC-15**: Pengaturan Company Profile

### Use Case - Kitchen
1. **UC-16**: Lihat Kitchen Display
2. **UC-17**: Update Status Pesanan

---

## 3. Activity Diagram - Proses Pemesanan

**File:** `activity-order.mmd` | **Gambar:** `images/activity-order.png`

### Deskripsi
Menggambarkan alur aktivitas pelanggan saat melakukan pemesanan menu.

### Alur Proses
```
Start
  ↓
Pelanggan Scan QR Code di Meja
  ↓
Sistem Deteksi Nomor Meja
  ↓
Tampilkan Halaman Menu
  ↓
[Decision] Pilih Menu?
  ├─ Ya → Klik Menu Item → Tampilkan Modal Varian
  │        ↓
  │        [Decision] Ada Pilihan Varian?
  │        ├─ Ya → Pilih Suhu/Gula/Ukuran
  │        └─ Tidak → Set Default
  │        ↓
  │        Atur Jumlah → Tambah ke Keranjang → Update Session Cart
  │        ↓
  │        [Decision] Pesan Lagi? → Ya (kembali ke Menu)
  │        └─ Tidak ↓
  └─ Tidak ↓
Buka Keranjang → Review Pesanan
  ↓
[Decision] Checkout?
  ├─ Tidak → Kembali ke Menu
  └─ Ya ↓
Input Nama Pelanggan → Konfirmasi Nomor Meja → Klik Pesan Sekarang
  ↓
Simpan ke Database → Generate Order Number → Kosongkan Cart
  ↓
Tampilkan Halaman Sukses → Pelanggan Tunggu Pesanan
  ↓
End
```

---

## 4. Activity Diagram - Admin

**File:** `activity-admin.mmd` | **Gambar:** `images/activity-admin.png`

### Deskripsi
Menggambarkan alur aktivitas admin dalam mengelola sistem.

### Alur Proses
```
Start
  ↓
Admin Buka Halaman Login → Input Username & Password
  ↓
[Decision] Validasi Login
  ├─ Gagal → Tampilkan Error (kembali ke Login)
  └─ Berhasil ↓
Redirect ke Dashboard
  ↓
[Decision] Pilih Menu Admin
  ├─ Kitchen Display → Lihat Pesanan Aktif → Update Status
  ├─ Kelola Menu → Lihat Daftar Produk → Tambah/Edit/Hapus
  ├─ Kelola Kategori → Lihat Daftar Kategori → Tambah/Edit
  ├─ Laporan → Pilih Range Tanggal → Tampilkan Statistik
  └─ Logout → Hapus Session → End
```

---

## 5. Sequence Diagram - Order Flow

**File:** `sequence-order.mmd` | **Gambar:** `images/sequence-order.png`

### Deskripsi
Menggambarkan urutan interaksi antar komponen sistem saat proses pemesanan.

### Komponen
- **Pelanggan**: User yang memesan
- **Browser**: Antarmuka web
- **Server (Express)**: Backend aplikasi
- **MySQL Database**: Penyimpanan data
- **Kitchen Display**: Tampilan untuk dapur

### Sequence Flow
1. Pelanggan scan QR Code → Browser request ke Server
2. Server set session tableNumber → Query menu dari Database
3. Server render halaman menu → Tampilkan ke Pelanggan
4. Pelanggan pilih menu → Server fetch product detail
5. Pelanggan tambah ke cart → Server update session cart
6. Pelanggan checkout → Server generate order number
7. Server BEGIN TRANSACTION → INSERT orders & order_items → COMMIT
8. Server clear cart → Redirect ke success page
9. Kitchen Display fetch active orders → Update status pesanan

---

## 6. Class Diagram

**File:** `class-diagram.mmd` | **Gambar:** `images/class-diagram.png`

### Deskripsi
Menggambarkan struktur class/objek dalam sistem beserta atribut dan method-nya.

### Classes

| Class | Atribut | Methods |
|-------|---------|---------|
| **User** | id, username, password, full_name, role | login(), logout() |
| **Category** | id, name, icon, sort_order, is_active | getProducts() |
| **Product** | id, category_id, name, price, description, image, variant options | getCategory(), calculatePrice(), toggleAvailability() |
| **Order** | id, order_number, customer_name, table_number, total_price, status | getItems(), updateStatus(), calculateTotal() |
| **OrderItem** | id, order_id, product_id, qty, price_at_order, variant_info | getProduct(), getSubtotal() |
| **Cart** | items, tableNumber | addItem(), removeItem(), updateQuantity(), clear(), getTotal() |
| **CompanyInfo** | id, key_name, value | getValue(), setValue() |

### Relasi
- Category **1** → **\*** Product (contains)
- Order **1** → **\*** OrderItem (has)
- Product **1** → **\*** OrderItem (ordered_as)
- Cart **1** → **\*** Product (contains)

---

## 7. Flowchart Sistem

**File:** `flowchart.mmd` | **Gambar:** `images/flowchart.png`

### Deskripsi
Menggambarkan alur sistem secara keseluruhan untuk Customer dan Admin.

### Customer Flow
```
Scan QR Code → Halaman Menu → Pilih Menu → Modal Varian → Tambah ke Cart
     ↓
[Pesan Lagi?] → Ya (kembali ke Menu)
     ↓ Tidak
Checkout → Input Nama → Konfirmasi Pesanan → Order Success → Track Status
```

### Admin Flow
```
Login → Dashboard → [Menu Admin]
                      ├─ Kitchen Display → Update Status
                      ├─ Kelola Menu
                      ├─ Kelola Kategori
                      ├─ Laporan
                      └─ Pengaturan
```

---

## 8. Architecture Diagram

**File:** `architecture.mmd` | **Gambar:** `images/architecture.png`

### Deskripsi
Menggambarkan arsitektur sistem secara keseluruhan dengan layer-layer yang digunakan.

### Layer Architecture

| Layer | Komponen | Deskripsi |
|-------|----------|-----------|
| **Client Layer** | Mobile Browser, Desktop Browser | Antarmuka pengguna |
| **Presentation Layer** | EJS Views, Static Assets (CSS/JS) | Tampilan halaman |
| **Application Layer** | Express Routes, Middleware | Routing dan logic |
| **Business Logic** | Order Processing, Cart Management, Product Management, Authentication, Reports | Logika bisnis |
| **Data Layer** | MySQL Database, Session Storage | Penyimpanan data |

### Technology Stack
- **Frontend**: EJS, Bootstrap 5, Font Awesome
- **Backend**: Node.js, Express.js
- **Database**: MySQL
- **Session**: express-session

---

## Status Pesanan

Alur status pesanan dalam sistem:

```
PENDING → LUNAS (paid) → MASAK (cooking) → ANTAR (served)
```

| Status | Warna | Deskripsi |
|--------|-------|-----------|
| **Pending** | 🟡 Kuning | Pesanan baru, menunggu pembayaran |
| **Lunas (paid)** | 🟢 Hijau | Sudah dibayar di kasir |
| **Masak (cooking)** | 🔵 Biru | Sedang diproses di dapur |
| **Antar (served)** | 🔷 Biru Tua | Sudah diantar ke meja pelanggan |
| **Cancelled** | 🔴 Merah | Pesanan dibatalkan |

---

## Cara Generate Ulang Gambar

Jika ingin generate ulang gambar diagram dengan kualitas lebih tinggi:

```bash
# Install mermaid-cli (jika belum)
npm install -g @mermaid-js/mermaid-cli

# Generate dengan scale 2x untuk kualitas lebih baik
npx @mermaid-js/mermaid-cli -i diagram.mmd -o output.png -s 2 -b white

# Atau generate sebagai SVG (vector, tidak pecah)
npx @mermaid-js/mermaid-cli -i diagram.mmd -o output.svg -b white
```

### Alternatif Online
1. Buka https://mermaid.live/
2. Paste kode dari file `.mmd`
3. Download sebagai PNG/SVG dengan kualitas tinggi

---

*Dokumen ini dibuat untuk keperluan dokumentasi skripsi.*
*© 2024 House of Nosty*
