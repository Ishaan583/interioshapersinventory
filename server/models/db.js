const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

let isMongo = false;

// Mongoose Models
let UserModel, SiteModel, MaterialModel, RequestModel, HistoryModel;

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
    site: { type: String, required: true }
  }, { timestamps: true });

  const requestSchema = new mongoose.Schema({
    name: { type: String, required: true },
    category: { type: String, required: true },
    quantity: { type: Number, required: true },
    reason: { type: String, default: '' },
    type: { type: String, enum: ['request', 'return'], default: 'request' },
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'returned'], default: 'pending' },
    workerName: { type: String, required: true },
    workerId: { type: String, required: true },
    site: { type: String, required: true },
    date: { type: Date, default: Date.now }
  }, { timestamps: true });

  const historySchema = new mongoose.Schema({
    userName: { type: String, required: true },
    action: { type: String, required: true },
    site: { type: String, default: '' },
    date: { type: Date, default: Date.now }
  }, { timestamps: true });

  UserModel = mongoose.model('User', userSchema);
  SiteModel = mongoose.model('Site', siteSchema);
  MaterialModel = mongoose.model('Material', materialSchema);
  RequestModel = mongoose.model('Request', requestSchema);
  HistoryModel = mongoose.model('History', historySchema);
};

// JSON Database Implementation
const JSON_DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

const readJsonDb = () => {
  if (!fs.existsSync(path.dirname(JSON_DB_PATH))) {
    fs.mkdirSync(path.dirname(JSON_DB_PATH), { recursive: true });
  }
  if (!fs.existsSync(JSON_DB_PATH)) {
    const initialDb = { users: [], sites: [], materials: [], requests: [], history: [] };
    fs.writeFileSync(JSON_DB_PATH, JSON.stringify(initialDb, null, 2));
    return initialDb;
  }
  try {
    const data = fs.readFileSync(JSON_DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading JSON DB, resetting...', err);
    return { users: [], sites: [], materials: [], requests: [], history: [] };
  }
};

const writeJsonDb = (data) => {
  fs.writeFileSync(JSON_DB_PATH, JSON.stringify(data, null, 2));
};

const generateId = () => Math.random().toString(36).substr(2, 9);

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (uri) {
    try {
      await mongoose.connect(uri);
      isMongo = true;
      initializeMongoModels();
      console.log('✅ Connected to MongoDB Atlas Database');
      return true;
    } catch (err) {
      console.error('❌ Failed to connect to MongoDB, falling back to local JSON database...', err.message);
    }
  }
  
  // Local JSON Database initialization
  console.log('ℹ️ Using Local JSON Database Fallback');
  readJsonDb(); // Ensure db file exists
  return false;
};

// Abstract Database API
const DB = {
  isMongo: () => isMongo,
  
  Users: {
    find: async (query = {}) => {
      if (isMongo) return await UserModel.find(query);
      const db = readJsonDb();
      return db.users.filter(u => {
        for (let key in query) {
          if (u[key] !== query[key]) return false;
        }
        return true;
      });
    },
    findOne: async (query) => {
      if (isMongo) return await UserModel.findOne(query);
      const db = readJsonDb();
      return db.users.find(u => {
        for (let key in query) {
          if (u[key] !== query[key]) return false;
        }
        return true;
      }) || null;
    },
    findById: async (id) => {
      if (isMongo) return await UserModel.findById(id);
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
      if (isMongo) return await UserModel.findByIdAndUpdate(id, update, { new: true });
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
      if (isMongo) return await SiteModel.find(query);
      const db = readJsonDb();
      return db.sites.filter(s => {
        for (let key in query) {
          if (s[key] !== query[key]) return false;
        }
        return true;
      });
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
      if (isMongo) return await MaterialModel.find(query);
      const db = readJsonDb();
      return db.materials.filter(m => {
        for (let key in query) {
          if (m[key] !== query[key]) return false;
        }
        return true;
      });
    },
    findOne: async (query) => {
      if (isMongo) return await MaterialModel.findOne(query);
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
      if (isMongo) return await MaterialModel.findByIdAndUpdate(id, update, { new: true });
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
      if (isMongo) return await RequestModel.find(query).sort({ date: -1 });
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
    create: async (reqDoc) => {
      if (isMongo) return await RequestModel.create(reqDoc);
      const db = readJsonDb();
      const newDoc = { _id: generateId(), status: 'pending', ...reqDoc, date: new Date().toISOString(), createdAt: new Date().toISOString() };
      db.requests.push(newDoc);
      writeJsonDb(db);
      return newDoc;
    },
    findById: async (id) => {
      if (isMongo) return await RequestModel.findById(id);
      const db = readJsonDb();
      return db.requests.find(r => r._id === id) || null;
    },
    findByIdAndUpdate: async (id, update) => {
      if (isMongo) return await RequestModel.findByIdAndUpdate(id, update, { new: true });
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

  History: {
    find: async (query = {}) => {
      if (isMongo) return await HistoryModel.find(query).sort({ date: -1 }).limit(15);
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
