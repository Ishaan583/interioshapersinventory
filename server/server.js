const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const { connectDB, DB } = require('./models/db');

// Route Imports
const authRoutes = require('./routes/auth');
const sitesRoutes = require('./routes/sites');
const materialsRoutes = require('./routes/materials');
const requestsRoutes = require('./routes/requests');
const reportsRoutes = require('./routes/reports');
const usersRoutes = require('./routes/users');
const statsRoutes = require('./routes/stats');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Load API Routes
app.use('/api/auth', authRoutes);
app.use('/api/sites', sitesRoutes);
app.use('/api/materials', materialsRoutes);
app.use('/api/requests', requestsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/stats', statsRoutes);

// Seed function to pre-populate DB with default sites, materials, and accounts
const seedDatabase = async () => {
  try {
    const existingSites = await DB.Sites.find();
    if (existingSites.length > 0) {
      console.log('ℹ️ Database already seeded. Skipping initial seeding.');
      return;
    }

    console.log('🌱 Seeding database initial mock data...');

    // 1. Create Default Users (removed for real registration bootstrap)

    // 2. Create Default Sites
    const defaultSites = ['Jaipur', 'Delhi', 'Noida', 'Bhopal', 'Indore', 'Mumbai'];
    for (let siteName of defaultSites) {
      await DB.Sites.create({ name: siteName });
    }

    // 3. Create Default Materials (Seeding ALL predefined items for ALL sites)
    const { PREDEFINED_ITEMS } = require('./utils/predefined');

    for (let site of defaultSites) {
      for (let category in PREDEFINED_ITEMS) {
        const itemNames = PREDEFINED_ITEMS[category];
        for (let name of itemNames) {
          const quantity = 0;
          
          await DB.Materials.create({
            name,
            category,
            quantity,
            site
          });
        }
      }
    }

    // 4. Create some initial history activity logs
    await DB.History.create({
      userName: 'System Init',
      action: 'Seeded initial materials and user accounts for Interio Shapers inventory launch.',
      site: 'All'
    });

    console.log('✅ Seeding complete!');
  } catch (err) {
    console.error('❌ Failed to seed database:', err);
  }
};

// Start Server & Connect DB
const startServer = async () => {
  await connectDB();
  await seedDatabase();
  
  app.listen(PORT, () => {
    console.log(`🚀 Express server running on port ${PORT}`);
  });
};

startServer();
