-- =====================================================
-- DATABASE SCHEMA: House of Nosty E-Menu System
-- Judul Skripsi: Perancangan Sistem Informasi Website 
-- Company Profile dan E-Menu Interactive pada 
-- Coffee Shop House of Nosty
-- =====================================================

-- Buat Database
CREATE DATABASE IF NOT EXISTS db_nosty_gacoan;
USE db_nosty_gacoan;

-- =====================================================
-- 1. TABEL USERS (Admin)
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    role ENUM('admin', 'kasir', 'kitchen') DEFAULT 'admin',
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =====================================================
-- 2. TABEL CATEGORIES (Kategori Menu)
-- =====================================================
CREATE TABLE IF NOT EXISTS categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL,
    icon VARCHAR(50) DEFAULT 'fa-coffee',
    sort_order INT DEFAULT 0,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 3. TABEL PRODUCTS (Menu)
-- =====================================================
CREATE TABLE IF NOT EXISTS products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    category_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    price INT NOT NULL,
    description TEXT,
    image VARCHAR(255) DEFAULT 'default-menu.jpg',
    is_available TINYINT(1) DEFAULT 1,
    has_temperature_option TINYINT(1) DEFAULT 1,
    has_sugar_option TINYINT(1) DEFAULT 1,
    has_size_option TINYINT(1) DEFAULT 0,
    large_price_add INT DEFAULT 5000,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- =====================================================
-- 4. TABEL ORDERS (Transaksi/Pesanan)
-- =====================================================
CREATE TABLE IF NOT EXISTS orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_number VARCHAR(20) NOT NULL UNIQUE,
    customer_name VARCHAR(100) NOT NULL,
    table_number VARCHAR(10) NOT NULL,
    total_price INT NOT NULL,
    status ENUM('pending', 'cooking', 'served', 'paid', 'cancelled') DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =====================================================
-- 5. TABEL ORDER_ITEMS (Detail Pesanan + Varian)
-- =====================================================
CREATE TABLE IF NOT EXISTS order_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    qty INT NOT NULL DEFAULT 1,
    price_at_order INT NOT NULL,
    variant_info VARCHAR(255),
    notes VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- =====================================================
-- 6. TABEL COMPANY_INFO (Informasi Company Profile)
-- =====================================================
CREATE TABLE IF NOT EXISTS company_info (
    id INT PRIMARY KEY AUTO_INCREMENT,
    key_name VARCHAR(50) NOT NULL UNIQUE,
    value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =====================================================
-- DATA AWAL (SEEDER)
-- =====================================================

-- Insert Admin Default (password: admin123)
INSERT INTO users (username, password, full_name, role) VALUES 
('admin', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Administrator', 'admin'),
('kitchen', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Dapur', 'kitchen');

-- Insert Kategori
INSERT INTO categories (name, icon, sort_order) VALUES 
('Kopi', 'fa-coffee', 1),
('Non-Kopi', 'fa-glass-water', 2),
('Makanan', 'fa-utensils', 3),
('Snack', 'fa-cookie', 4);

-- Insert Menu Contoh
INSERT INTO products (category_id, name, price, description, has_temperature_option, has_sugar_option, has_size_option) VALUES 
-- Kopi
(1, 'Espresso', 18000, 'Espresso shot murni dengan rasa bold dan intense', 1, 1, 1),
(1, 'Americano', 22000, 'Espresso dengan air panas, rasa smooth dan clean', 1, 1, 1),
(1, 'Cappuccino', 28000, 'Espresso dengan steamed milk dan foam lembut', 1, 1, 1),
(1, 'Caffe Latte', 28000, 'Espresso dengan susu steamed yang creamy', 1, 1, 1),
(1, 'Kopi Susu Nosty', 25000, 'Signature drink! Kopi susu dengan gula aren', 1, 1, 1),
(1, 'Mocha', 32000, 'Espresso dengan cokelat dan susu', 1, 1, 1),
(1, 'Caramel Macchiato', 35000, 'Espresso dengan vanilla, susu, dan caramel drizzle', 1, 1, 1),
(1, 'Affogato', 30000, 'Espresso shot dituang di atas vanilla ice cream', 0, 0, 0),

-- Non-Kopi
(2, 'Matcha Latte', 30000, 'Green tea matcha premium dengan susu', 1, 1, 1),
(2, 'Chocolate', 28000, 'Cokelat premium dengan susu', 1, 1, 1),
(2, 'Red Velvet', 30000, 'Red velvet cream dengan susu', 1, 1, 1),
(2, 'Taro Latte', 28000, 'Taro dengan susu yang creamy', 1, 1, 1),
(2, 'Thai Tea', 25000, 'Thai tea klasik dengan susu', 1, 1, 1),
(2, 'Lemon Tea', 20000, 'Teh dengan perasan lemon segar', 1, 1, 0),
(2, 'Fresh Orange', 22000, 'Jus jeruk segar', 0, 1, 0),

-- Makanan
(3, 'Nasi Goreng Nosty', 35000, 'Nasi goreng spesial dengan telur dan ayam', 0, 0, 0),
(3, 'Mie Goreng Nosty', 32000, 'Mie goreng dengan bumbu rahasia', 0, 0, 0),
(3, 'Chicken Katsu', 38000, 'Ayam katsu crispy dengan saus', 0, 0, 0),
(3, 'Spaghetti Bolognese', 40000, 'Spaghetti dengan saus bolognese homemade', 0, 0, 0),
(3, 'Chicken Wings', 35000, 'Sayap ayam goreng crispy (6 pcs)', 0, 0, 0),

-- Snack
(4, 'French Fries', 20000, 'Kentang goreng crispy', 0, 0, 0),
(4, 'Onion Rings', 22000, 'Bawang goreng crispy', 0, 0, 0),
(4, 'Roti Bakar', 18000, 'Roti bakar dengan berbagai topping', 0, 0, 0),
(4, 'Pisang Goreng', 15000, 'Pisang goreng crispy dengan topping', 0, 0, 0),
(4, 'Croffle', 25000, 'Croissant waffle dengan topping', 0, 0, 0);

-- =====================================================
-- 7. TABEL ACTIVITY_LOGS (Log Aktivitas Staff)
-- =====================================================
CREATE TABLE IF NOT EXISTS activity_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    action VARCHAR(100) NOT NULL,
    description TEXT,
    order_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
);

-- =====================================================
-- 8. TABEL STAFF_SHIFTS (Shift Kerja Hari Ini)
-- =====================================================
CREATE TABLE IF NOT EXISTS staff_shifts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    shift_date DATE NOT NULL,
    check_in TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    check_out TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_shift (user_id, shift_date)
);

-- Insert Company Info
INSERT INTO company_info (key_name, value) VALUES 
('name', 'House of Nosty'),
('tagline', 'Your Cozy Coffee Destination'),
('description', 'House of Nosty adalah coffee shop yang menghadirkan pengalaman ngopi yang nyaman dan memorable. Dengan konsep modern dan menu berkualitas, kami siap menemani hari-harimu.'),
('address', 'Jl. Contoh Alamat No. 123, Kota, Indonesia'),
('phone', '+62 812-3456-7890'),
('email', 'hello@houseofnosty.com'),
('instagram', '@houseofnosty'),
('opening_hours', 'Senin - Minggu: 08:00 - 22:00'),
('wifi_password', 'nosty2024');
