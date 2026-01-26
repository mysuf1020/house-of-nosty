const db = require('./database');
const bcrypt = require('bcryptjs');

async function seedDatabase() {
    try {
        // Check if admin user exists
        const [users] = await db.query('SELECT * FROM users WHERE username = ?', ['admin']);
        
        if (users.length === 0) {
            // Hash password
            const hashedPassword = await bcrypt.hash('admin123', 10);
            
            // Insert admin user
            await db.query(
                'INSERT INTO users (username, password, full_name, role) VALUES (?, ?, ?, ?)',
                ['admin', hashedPassword, 'Administrator', 'admin']
            );
            console.log('✅ Admin user created (username: admin, password: admin123)');
            
            // Insert kitchen user
            const kitchenPassword = await bcrypt.hash('admin123', 10);
            await db.query(
                'INSERT INTO users (username, password, full_name, role) VALUES (?, ?, ?, ?)',
                ['kitchen', kitchenPassword, 'Dapur', 'kitchen']
            );
            console.log('✅ Kitchen user created (username: kitchen, password: admin123)');
        } else {
            // Update existing admin & kitchen password to ensure it works
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await db.query('UPDATE users SET password = ? WHERE username = ?', [hashedPassword, 'admin']);
            await db.query('UPDATE users SET password = ? WHERE username = ?', [hashedPassword, 'kitchen']);
            
            // Ensure kitchen user exists
            const [kitchenUser] = await db.query('SELECT * FROM users WHERE username = ?', ['kitchen']);
            if (kitchenUser.length === 0) {
                await db.query(
                    'INSERT INTO users (username, password, full_name, role) VALUES (?, ?, ?, ?)',
                    ['kitchen', hashedPassword, 'Dapur', 'kitchen']
                );
                console.log('✅ Kitchen user created');
            }
            console.log('✅ Admin & Kitchen password updated');
        }
        
        // Check if categories exist
        const [categories] = await db.query('SELECT * FROM categories');
        if (categories.length === 0) {
            await db.query(`
                INSERT INTO categories (name, icon, sort_order) VALUES
                ('Kopi', 'fa-coffee', 1),
                ('Non-Kopi', 'fa-glass-water', 2),
                ('Makanan', 'fa-utensils', 3),
                ('Snack', 'fa-cookie', 4)
            `);
            console.log('✅ Categories seeded');
        }
        
        console.log('🌱 Database seeding completed!');
    } catch (error) {
        console.error('❌ Seeding error:', error.message);
    }
}

module.exports = seedDatabase;
