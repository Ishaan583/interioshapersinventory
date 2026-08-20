const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

let isMongo = false;

// Mongoose Models
let UserModel, SiteModel, MaterialModel, RequestModel, HistoryModel, UnitModel;

const initializeMongoModels = () => {
  const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'worker'], default: 'worker' },
    assignedSite: { type: String, default: '' }
  }, { timestamps: true });

  const siteSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true }
  }, { timestamps: true });

  const materialSchema = new mongoose.Schema({
    name: { type: String, required: true },
    category: { type: String, required: true },
    quantity: { type: Number, required: true, default: 0 },
    unit: { type: String, default: '' },
    site: { type: String, required: true }
  }, { timestamps: true });

  // Indexes: every material read filters on site and/or category
  materialSchema.index({ site: 1, category: 1 });
  materialSchema.index({ site: 1, category: 1, name: 1 });

  const requestSchema = new mongoose.Schema({
    name: { type: String, required: true },
    category: { type: String, required: true },
    quantity: { type: Number, required: true },
    unit: { type: String, default: '' },
    reason: { type: String, default: '' },
    type: { type: String, enum: ['request', 'return'], default: 'request' },
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'returned'], default: 'pending' },
    workerName: { type: String, required: true },
    workerId: { type: String, required: true },
    site: { type: String, required: true },
    date: { type: Date, default: Date.now }
  }, { timestamps: true });

  requestSchema.index({ workerId: 1, date: -1 });
  requestSchema.index({ site: 1, status: 1 });

  const historySchema = new mongoose.Schema({
    userName: { type: String, required: true },
    action: { type: String, required: true },
    site: { type: String, default: '' },
    date: { type: Date, default: Date.now }
  }, { timestamps: true });

  historySchema.index({ site: 1, date: -1 });

  // Shared vocabulary of measurement units shown in the unit dropdown.
  // `key` is the lowercased name and carries the uniqueness constraint so
  // "Bag" and "bag" cannot both be added.
  const unitSchema = new mongoose.Schema({
    name: { type: String, required: true },
    key: { type: String, required: true, unique: true },
    order: { type: Number, default: 100 }
  }, { timestamps: true });

  UserModel = mongoose.model('User', userSchema);
  SiteModel = mongoose.model('Site', siteSchema);
  MaterialModel = mongoose.model('Material', materialSchema);
  RequestModel = mongoose.model('Request', requestSchema);
  HistoryModel = mongoose.model('History', historySchema);
  UnitModel = mongoose.model('Unit', unitSchema);
};

// JSON Database Implementation
const JSON_DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

const readJsonDb = () => {
  if (!fs.existsSync(path.dirname(JSON_DB_PATH))) {
    fs.mkdirSync(path.dirname(JSON_DB_PATH), { recursive: true });
  }
  if (!fs.existsSync(JSON_DB_PATH)) {
    const initialDb = { users: [], sites: [], materials: [], requests: [], history: [], units: [] };
    fs.writeFileSync(JSON_DB_PATH, JSON.stringify(initialDb, null, 2));
    return initialDb;
  }
  try {
    const data = fs.readFileSync(JSON_DB_PATH, 'utf8');
    const parsed = JSON.parse(data);
    // Collections added after a db.json was first written
    if (!parsed.units) parsed.units = [];
    return parsed;
  } catch (err) {
    console.error('Error reading JSON DB, resetting...', err);
    return { users: [], sites: [], materials: [], requests: [], history: [], units: [] };
  }
};

const writeJsonDb = (data) => {
  fs.writeFileSync(JSON_DB_PATH, JSON.stringify(data, null, 2));
};

const generateId = () => Math.random().toString(36).substr(2, 9);

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (uri) {
    // When a real database is configured we retry instead of silently dropping to
    // the JSON file — that fallback lives on Render's ephemeral disk and would
    // quietly lose every write on the next restart.
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        await mongoose.connect(uri, {
          serverSelectionTimeoutMS: 10000,
          socketTimeoutMS: 45000,
          maxPoolSize: 10,
          minPoolSize: 1
        });
        isMongo = true;
        initializeMongoModels();
        console.log('✅ Connected to MongoDB Atlas Database');
        return true;
      } catch (err) {
        console.error(`❌ MongoDB connection attempt ${attempt}/5 failed: ${err.message}`);
        if (attempt < 5) await sleep(attempt * 2000);
      }
    }
    throw new Error('Could not connect to MongoDB after 5 attempts. Check MONGODB_URI and the Atlas IP allowlist.');
  }

  // Local JSON Database initialization (development only — no MONGODB_URI set)
  console.log('ℹ️ Using Local JSON Database Fallback');
  readJsonDb(); // Ensure db file exists
  return false;
};

// Abstract Database API
const DB = {
  isMongo: () => isMongo,
  
  Users: {
    find: async (query = {}) => {
      if (isMongo) return await UserModel.find(query).lean();
      const db = readJsonDb();
      return db.users.filter(u => {
        for (let key in query) {
          if (u[key] !== query[key]) return false;
        }
        return true;
      });
    },
    findOne: async (query) => {
      if (isMongo) return await UserModel.findOne(query).lean();
      const db = readJsonDb();
      return db.users.find(u => {
        for (let key in query) {
          if (u[key] !== query[key]) return false;
        }
        return true;
      }) || null;
    },
    findById: async (id) => {
      if (isMongo) return await UserModel.findById(id).lean();
      const db = readJsonDb();
      return db.users.find(u => u._id === id) || null;
    },
    create: async (userDoc) => {
      if (isMongo) return await UserModel.create(userDoc);
      const db = readJsonDb();
      const newDoc = { _id: generateId(), ...userDoc, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      db.users.push(newDoc);
      writeJsonDb(db);
      return newDoc;
    },
    findByIdAndUpdate: async (id, update) => {
      if (isMongo) return await UserModel.findByIdAndUpdate(id, update, { new: true }).lean();
      const db = readJsonDb();
      const idx = db.users.findIndex(u => u._id === id);
      if (idx !== -1) {
        db.users[idx] = { ...db.users[idx], ...update, updatedAt: new Date().toISOString() };
        writeJsonDb(db);
        return db.users[idx];
      }
      return null;
    }
  },

  Sites: {
    find: async (query = {}) => {
      if (isMongo) return await SiteModel.find(query).lean();
      const db = readJsonDb();
      return db.sites.filter(s => {
        for (let key in query) {
          if (s[key] !== query[key]) return false;
        }
        return true;
      });
    },
    count: async (query = {}) => {
      if (isMongo) return await SiteModel.countDocuments(query);
      const db = readJsonDb();
      return db.sites.filter(x => {
        for (let key in query) {
          if (x[key] !== query[key]) return false;
        }
        return true;
      }).length;
    },
    create: async (siteDoc) => {
      if (isMongo) return await SiteModel.create(siteDoc);
      const db = readJsonDb();
      if (db.sites.some(s => s.name.toLowerCase() === siteDoc.name.toLowerCase())) {
        throw new Error('Site already exists');
      }
      const newDoc = { _id: generateId(), ...siteDoc, createdAt: new Date().toISOString() };
      db.sites.push(newDoc);
      writeJsonDb(db);
      return newDoc;
    },
    findByIdAndDelete: async (id) => {
      if (isMongo) return await SiteModel.findByIdAndDelete(id);
      const db = readJsonDb();
      const idx = db.sites.findIndex(s => s._id === id);
      if (idx !== -1) {
        const deleted = db.sites[idx];
        db.sites.splice(idx, 1);
        writeJsonDb(db);
        return deleted;
      }
      return null;
    }
  },

  Materials: {
    find: async (query = {}) => {
      if (isMongo) return await MaterialModel.find(query).lean();
      const db = readJsonDb();
      return db.materials.filter(m => {
        for (let key in query) {
          if (m[key] !== query[key]) return false;
        }
        return true;
      });
    },
    findOne: async (query) => {
      if (isMongo) return await MaterialModel.findOne(query).lean();
      const db = readJsonDb();
      return db.materials.find(m => {
        for (let key in query) {
          if (m[key] !== query[key]) return false;
        }
        return true;
      }) || null;
    },
    create: async (materialDoc) => {
      if (isMongo) return await MaterialModel.create(materialDoc);
      const db = readJsonDb();
      const newDoc = { _id: generateId(), ...materialDoc, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      db.materials.push(newDoc);
      writeJsonDb(db);
      return newDoc;
    },
    findByIdAndUpdate: async (id, update) => {
      if (isMongo) return await MaterialModel.findByIdAndUpdate(id, update, { new: true }).lean();
      const db = readJsonDb();
      const idx = db.materials.findIndex(m => m._id === id);
      if (idx !== -1) {
        db.materials[idx] = { ...db.materials[idx], ...update, updatedAt: new Date().toISOString() };
        writeJsonDb(db);
        return db.materials[idx];
      }
      return null;
    },
    findByIdAndDelete: async (id) => {
      if (isMongo) return await MaterialModel.findByIdAndDelete(id);
      const db = readJsonDb();
      const idx = db.materials.findIndex(m => m._id === id);
      if (idx !== -1) {
        const deleted = db.materials[idx];
        db.materials.splice(idx, 1);
        writeJsonDb(db);
        return deleted;
      }
      return null;
    },
    count: async (query = {}) => {
      // Counting server-side avoids pulling every matching document over the
      // wire just to read its .length.
      if (isMongo) return await MaterialModel.countDocuments(query);
      const db = readJsonDb();
      return db.materials.filter(m => {
        for (let key in query) {
          if (m[key] !== query[key]) return false;
        }
        return true;
      }).length;
    },
    insertMany: async (docs) => {
      if (!docs || docs.length === 0) return [];
      if (isMongo) return await MaterialModel.insertMany(docs, { ordered: false });
      const db = readJsonDb();
      const now = new Date().toISOString();
      const created = docs.map(d => ({ _id: generateId(), ...d, createdAt: now, updatedAt: now }));
      db.materials.push(...created);
      writeJsonDb(db);
      return created;
    },
    updateMany: async (filter, update) => {
      if (isMongo) return await MaterialModel.updateMany(filter, update);
      const db = readJsonDb();
      let modifiedCount = 0;
      db.materials = db.materials.map(m => {
        let match = true;
        for (let key in filter) {
          if (m[key] !== filter[key]) {
            match = false;
            break;
          }
        }
        if (match) {
          modifiedCount++;
          const setFields = update.$set || update;
          return { ...m, ...setFields, updatedAt: new Date().toISOString() };
        }
        return m;
      });
      writeJsonDb(db);
      return { modifiedCount };
    }
  },

  Requests: {
    find: async (query = {}) => {
      if (isMongo) return await RequestModel.find(query).sort({ date: -1 }).lean();
      const db = readJsonDb();
      const filtered = db.requests.filter(r => {
        for (let key in query) {
          if (r[key] !== query[key]) return false;
        }
        return true;
      });
      // Sort by date desc
      return filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    },
    count: async (query = {}) => {
      if (isMongo) return await RequestModel.countDocuments(query);
      const db = readJsonDb();
      return db.requests.filter(r => {
        for (let key in query) {
          if (r[key] !== query[key]) return false;
        }
        return true;
      }).length;
    },
    create: async (reqDoc) => {
      if (isMongo) return await RequestModel.create(reqDoc);
      const db = readJsonDb();
      const newDoc = { _id: generateId(), status: 'pending', ...reqDoc, date: new Date().toISOString(), createdAt: new Date().toISOString() };
      db.requests.push(newDoc);
      writeJsonDb(db);
      return newDoc;
    },
    findById: async (id) => {
      if (isMongo) return await RequestModel.findById(id).lean();
      const db = readJsonDb();
      return db.requests.find(r => r._id === id) || null;
    },
    findByIdAndUpdate: async (id, update) => {
      if (isMongo) return await RequestModel.findByIdAndUpdate(id, update, { new: true }).lean();
      const db = readJsonDb();
      const idx = db.requests.findIndex(r => r._id === id);
      if (idx !== -1) {
        db.requests[idx] = { ...db.requests[idx], ...update, updatedAt: new Date().toISOString() };
        writeJsonDb(db);
        return db.requests[idx];
      }
      return null;
    }
  },

  Units: {
    find: async () => {
      if (isMongo) return await UnitModel.find().sort({ order: 1, name: 1 }).lean();
      const db = readJsonDb();
      return [...db.units].sort((a, b) => (a.order - b.order) || a.name.localeCompare(b.name));
    },
    findOne: async (query) => {
      if (isMongo) return await UnitModel.findOne(query).lean();
      const db = readJsonDb();
      return db.units.find(u => {
        for (let key in query) {
          if (u[key] !== query[key]) return false;
        }
        return true;
      }) || null;
    },
    create: async (unitDoc) => {
      if (isMongo) return await UnitModel.create(unitDoc);
      const db = readJsonDb();
      if (db.units.some(u => u.key === unitDoc.key)) {
        const err = new Error('Unit already exists');
        err.code = 11000;
        throw err;
      }
      const newDoc = { _id: generateId(), ...unitDoc, createdAt: new Date().toISOString() };
      db.units.push(newDoc);
      writeJsonDb(db);
      return newDoc;
    },
    insertMany: async (docs) => {
      if (!docs || docs.length === 0) return [];
      if (isMongo) return await UnitModel.insertMany(docs, { ordered: false });
      const db = readJsonDb();
      const now = new Date().toISOString();
      const created = docs
        .filter(d => !db.units.some(u => u.key === d.key))
        .map(d => ({ _id: generateId(), ...d, createdAt: now }));
      db.units.push(...created);
      writeJsonDb(db);
      return created;
    },
    findByIdAndDelete: async (id) => {
      if (isMongo) return await UnitModel.findByIdAndDelete(id);
      const db = readJsonDb();
      const idx = db.units.findIndex(u => u._id === id);
      if (idx !== -1) {
        const deleted = db.units[idx];
        db.units.splice(idx, 1);
        writeJsonDb(db);
        return deleted;
      }
      return null;
    }
  },

  History: {
    find: async (query = {}) => {
      if (isMongo) return await HistoryModel.find(query).sort({ date: -1 }).limit(15).lean();
      const db = readJsonDb();
      const filtered = db.history.filter(h => {
        for (let key in query) {
          if (h[key] !== query[key]) return false;
        }
        return true;
      });
      // Sort by date desc, limit to 15
      return filtered.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 15);
    },
    create: async (historyDoc) => {
      if (isMongo) return await HistoryModel.create(historyDoc);
      const db = readJsonDb();
      const newDoc = { _id: generateId(), ...historyDoc, date: new Date().toISOString() };
      db.history.push(newDoc);
      writeJsonDb(db);
      return newDoc;
    }
  }
};

module.exports = { connectDB, DB };
