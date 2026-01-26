const db = require('./database');
const bcrypt = require('bcryptjs');

async function seedDatabase() {
    try {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        
        // Seed default users
        const defaultUsers = [
            { username: 'admin', full_name: 'Administrator', role: 'admin' },
            { username: 'kasir1', full_name: 'Kasir 1', role: 'kasir' },
            { username: 'kitchen1', full_name: 'Kitchen 1', role: 'kitchen' }
        ];
        
        for (const user of defaultUsers) {
            const [existing] = await db.query('SELECT * FROM users WHERE username = ?', [user.username]);
            if (existing.length === 0) {
                await db.query(
                    'INSERT INTO users (username, password, full_name, role) VALUES (?, ?, ?, ?)',
                    [user.username, hashedPassword, user.full_name, user.role]
                );
                console.log(`✅ User ${user.username} created (password: admin123)`);
            } else {
                await db.query('UPDATE users SET password = ? WHERE username = ?', [hashedPassword, user.username]);
            }
        }
        console.log('✅ Users seeded/updated');
        
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
