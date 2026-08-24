const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { connectDB, DB } = require('./models/db');
const { PREDEFINED_ITEMS } = require('./utils/predefined');
const { DEFAULT_UNITS } = require('./utils/units');

// Route Imports
const authRoutes = require('./routes/auth');
const sitesRoutes = require('./routes/sites');
const materialsRoutes = require('./routes/materials');
const requestsRoutes = require('./routes/requests');
const reportsRoutes = require('./routes/reports');
const usersRoutes = require('./routes/users');
const statsRoutes = require('./routes/stats');
const unitsRoutes = require('./routes/units');
const workersRoutes = require('./routes/workers');
const dailyRoutes = require('./routes/daily');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// The HTTP server binds the port immediately so Render marks the instance live,
// while the database connects in the background. Until the DB is actually ready
// we must NOT serve requests: the DB layer would silently fall back to the local
// JSON file and write data that gets thrown away on the next deploy.
let dbReady = false;

// Health check — always answers instantly, used for uptime pings / warm-up.
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', dbReady, uptime: Math.round(process.uptime()) });
});

app.use('/api', (req, res, next) => {
  if (dbReady) return next();
  res.status(503).json({ message: 'Server is starting up. Please retry in a few seconds.' });
});

// Load API Routes
app.use('/api/auth', authRoutes);
app.use('/api/sites', sitesRoutes);
app.use('/api/materials', materialsRoutes);
app.use('/api/requests', requestsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/units', unitsRoutes);
app.use('/api/workers', workersRoutes);
app.use('/api/daily', dailyRoutes);

// Flatten PREDEFINED_ITEMS once into [{ category, name }]
const PREDEFINED_LIST = Object.entries(PREDEFINED_ITEMS).flatMap(([category, names]) =>
  names.map(name => ({ category, name }))
);

// Seed function to pre-populate DB with default sites and materials
const seedDatabase = async () => {
  try {
    const existingSites = await DB.Sites.find();
    if (existingSites.length > 0) {
      return false; // Already seeded — migrations will top up anything missing.
    }

    console.log('🌱 Seeding database initial mock data...');

    const defaultSites = ['Jaipur', 'Delhi', 'Noida', 'Bhopal', 'Indore', 'Mumbai'];
    await Promise.all(defaultSites.map(name => DB.Sites.create({ name })));

    // One bulk insert for every site × item instead of one round trip per item
    const docs = defaultSites.flatMap(site =>
      PREDEFINED_LIST.map(({ category, name }) => ({ name, category, quantity: 0, unit: '', site }))
    );
    await DB.Materials.insertMany(docs);

    await DB.History.create({
      userName: 'System Init',
      action: 'Seeded initial materials and user accounts for Interio Shapers inventory launch.',
      site: 'All'
    });

    console.log(`✅ Seeding complete (${docs.length} materials).`);
    return true;
  } catch (err) {
    console.error('❌ Failed to seed database:', err);
    return false;
  }
};

// Make sure the default measurement units exist. One read plus at most one
// bulk insert, so it stays cheap to run on every boot.
const seedUnits = async () => {
  try {
    const existing = await DB.Units.find();
    const seen = new Set(existing.map(u => u.key));

    const missing = DEFAULT_UNITS
      .map((name, index) => ({ name, key: name.toLowerCase(), order: index }))
      .filter(u => !seen.has(u.key));

    if (missing.length > 0) {
      await DB.Units.insertMany(missing);
      console.log(`✅ Added ${missing.length} default measurement units.`);
    }
  } catch (err) {
    console.error('❌ Failed to seed units:', err);
  }
};

// Database migrations. Runs in the background AFTER the port is already listening.
const runMigrations = async () => {
  try {
    console.log('🔄 Running database migrations...');

    // 1. Fold the retired 'Aluminium Work' category into 'Carpentry' (single query)
    const aluminiumUpdateResult = await DB.Materials.updateMany(
      { category: 'Aluminium Work' },
      { $set: { category: 'Carpentry' } }
    );
    if (aluminiumUpdateResult && aluminiumUpdateResult.modifiedCount > 0) {
      console.log(`✅ Migrated ${aluminiumUpdateResult.modifiedCount} Aluminium materials to Carpentry.`);
    }

    // 2. Make sure every site has every predefined material.
    //    Previously this did one findOne per site per item (6 sites x 144 items =
    //    864 sequential round trips, several minutes on a cold start). Now it is
    //    two reads plus at most one bulk insert.
    const [existingSites, allMaterials] = await Promise.all([
      DB.Sites.find(),
      DB.Materials.find()
    ]);

    const seen = new Set(allMaterials.map(m => `${m.site}||${m.category}||${m.name}`));

    const missing = [];
    for (const site of existingSites) {
      for (const { category, name } of PREDEFINED_LIST) {
        if (!seen.has(`${site.name}||${category}||${name}`)) {
          missing.push({ name, category, quantity: 0, unit: '', site: site.name });
        }
      }
    }

    if (missing.length > 0) {
      await DB.Materials.insertMany(missing);
      console.log(`✅ Pre-seeded ${missing.length} missing materials for existing project sites.`);
    } else {
      console.log('✅ All materials are fully up to date.');
    }
  } catch (err) {
    console.error('❌ Migration failed:', err);
  }
};

// Optional self-ping keeps a free-tier Render instance from spinning down
// (a cold start costs the user ~30-60s on the next login).
const startKeepAlive = () => {
  const url = process.env.KEEP_ALIVE_URL;
  if (!url) return;
  const FOURTEEN_MINUTES = 14 * 60 * 1000;
  setInterval(() => {
    fetch(`${url.replace(/\/$/, '')}/api/health`).catch(() => {});
  }, FOURTEEN_MINUTES).unref();
  console.log(`⏰ Keep-alive ping enabled for ${url}`);
};

// Start Server: listen first, warm the database up behind it.
const startServer = async () => {
  app.listen(PORT, () => {
    console.log(`🚀 Express server listening on port ${PORT} (database warming up...)`);
  });

  const startedAt = Date.now();
  try {
    await connectDB();
  } catch (err) {
    // Keep the process (and the health endpoint) alive so the failure is visible
    // in the logs and via /api/health instead of crash-looping on Render.
    console.error('❌ Database unavailable — API will keep returning 503:', err.message);
    return;
  }
  dbReady = true;
  console.log(`✅ Database ready in ${Date.now() - startedAt}ms — now accepting API requests.`);

  // Background work: never blocks a user request.
  const freshlySeeded = await seedDatabase();
  if (!freshlySeeded) await runMigrations();
  await seedUnits();

  startKeepAlive();
};

startServer();
