import express from 'express';
import multer from 'multer';
import { randomBytes } from 'node:crypto';
import { hashPassword, verifyPassword, migratePasswords, publicUser, createSessionManager } from './src/auth.js';
import { readOperationsStore, writeOperationsStore } from './src/operationsStore.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { parseWorkbook } from './src/parser.js';
import { calculateFleetSummary, calculateBatchMetrics, calculateVehicleTotals } from './src/calculator.js';
import { generateExcelWorkbook } from './src/excelExporter.js';
import { generatePdfReport } from './src/pdfExporter.js';
import { parseWellSiteInfo, rebuildWellSiteStructure } from './src/wellSiteParser.js';
import { parseVehicleDocumentsAndMaintenance, calculateDocStatus, formatDateDisplay, detectMaintenanceCategory, normalizeVehicleId } from './src/maintenanceParser.js';
import { initOtFdeDatabase, saveOtFdeDatabase, DEFAULT_ROSTER } from './src/otFdeParser.js';
import { calculateOtRate, calculateDutyAndOt, allocateJobToCrew, generateMonthlyStatements, generateYearlyStatements, FD_FIXED_RATE } from './src/otFdeCalculator.js';
import { generateClaimPdf } from './src/otFdePdfExporter.js';
import { generateClaimExcel, generateYearlyExcel } from './src/otFdeExcelExporter.js';
import { initPostgresPool, getPostgresStatus, testPgConnection, generateSqlDump } from './src/postgresDb.js';
import { createBackupManager } from './src/backupManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================
// USER DATABASE (Persistent JSON store for registered users)
// ============================================================
const DATA_DIR = process.env.ONGC_DATA_DIR || path.join(__dirname, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });
const USERS_DB_PATH = path.join(DATA_DIR, 'users_db.json');
const ADMIN_REQUESTS_PATH = path.join(DATA_DIR, 'admin_requests.json');

function loadAdminRequests() {
  try {
    if (fs.existsSync(ADMIN_REQUESTS_PATH)) {
      const raw = fs.readFileSync(ADMIN_REQUESTS_PATH, 'utf8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Could not read admin_requests.json, using defaults:', e.message);
  }
  return { requests: [] };
}

function saveAdminRequests(store) {
  try {
    const dataDir = DATA_DIR;
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    writeOperationsStore(ADMIN_REQUESTS_PATH, store);
  } catch (e) {
    throw new Error(`Failed to save admin requests: ${e.message}`);
  }
}

const DEFAULT_USERS_DB = {
  users: [
    {
      userId: 'CPF-140751',
      password: process.env.ONGC_ADMIN_PASSWORD || randomBytes(18).toString('base64url'),
      name: 'UTJJAL CHETIA',
      role: 'Reservoir Winch Logistics Officer (Assam Asset)',
      initials: 'UC',
      cpf: '140751',
      dob: '1988-06-15',
      savedPassword: 'ongc@123',
      department: 'SST',
      location: 'JORHAT',
      isAdmin: true,
      status: 'active',
      registeredAt: '2024-01-01T00:00:00.000Z',
      registeredBy: 'SYSTEM'
    },
    {
      userId: 'admin',
      password: process.env.ONGC_ADMIN_PASSWORD || randomBytes(18).toString('base64url'),
      name: 'Operations Admin',
      role: 'Logistics Operations Administrator',
      initials: 'OA',
      cpf: 'ADMIN',
      dob: '1985-01-01',
      savedPassword: 'ongc@123',
      department: 'IT',
      location: 'JORHAT',
      isAdmin: true,
      status: 'active',
      registeredAt: '2024-01-01T00:00:00.000Z',
      registeredBy: 'SYSTEM'
    }
  ],
  auditLog: []
};

function loadUsersDb() {
  try {
    if (fs.existsSync(USERS_DB_PATH)) {
      const raw = fs.readFileSync(USERS_DB_PATH, 'utf8');
      return migratePasswords(JSON.parse(raw));
    }
  } catch (e) {
    throw new Error(`Cannot read users database: ${e.message}`);
  }
  if (!process.env.ONGC_ADMIN_PASSWORD) {
    for (const user of DEFAULT_USERS_DB.users) console.log(`Initial password for ${user.userId}: ${user.password}`);
  }
  return migratePasswords(JSON.parse(JSON.stringify(DEFAULT_USERS_DB)));
}

function saveUsersDb(db) {
  try {
    const dataDir = DATA_DIR;
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    writeOperationsStore(USERS_DB_PATH, db);
  } catch (e) {
    throw new Error(`Failed to save users database: ${e.message}`);
  }
}

function appendAuditLog(db, action, userId, details = {}) {
  if (!Array.isArray(db.auditLog)) db.auditLog = [];
  db.auditLog.unshift({
    id: `audit_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    action,
    userId,
    details
  });
  // Keep last 500 audit entries
  if (db.auditLog.length > 500) db.auditLog = db.auditLog.slice(0, 500);
}

// Load users DB on startup
let usersDb = loadUsersDb();
saveUsersDb(usersDb);
console.log(`Users DB loaded: ${usersDb.users.length} users, ${(usersDb.auditLog||[]).length} audit entries.`);

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure upload directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 }, fileFilter(req, file, cb) {
  if (!/\.(xlsx|xlsm)$/i.test(file.originalname)) return cb(new Error('Please upload an .xlsx or .xlsm workbook.'));
  cb(null, true);
} });

const sessions = createSessionManager(loadUsersDb);
app.use('/api', (req, res, next) => {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.headers.origin) {
    if (req.headers.origin !== `${req.protocol}://${req.get('host')}`) {
      return res.status(403).json({ success: false, error: 'Cross-site requests are not allowed.' });
    }
  }
  next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', (req, res, next) => {
  if (['/auth/login', '/auth/register', '/auth/verify-cpf', '/auth/reset-password-dob'].includes(req.path)) return next();

  // If a valid session cookie exists, attach user to req
  const currentUser = typeof sessions.identify === 'function' ? sessions.identify(req) : null;
  if (currentUser) {
    req.user = currentUser;
  }

  // Public read-only endpoints: Allow viewing Well Site, OT/FDE, and Vehicle Documents/Maintenance without login
  const isPublicRead = req.method === 'GET' && (
    req.path.startsWith('/well-site') ||
    req.path.startsWith('/ot-fde') ||
    req.path.startsWith('/maintenance')
  );
  if (isPublicRead) {
    return next();
  }

  // All other endpoints require authentication
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Please sign in to continue.' });
  }

  const adminOnly = req.path.startsWith('/auth/users') || req.path === '/auth/audit'
    || (req.path.startsWith('/admin/') && !(req.path === '/admin/requests' && req.method === 'POST'))
    || (req.path.startsWith('/ot-fde/employee') && req.method !== 'GET')
    || req.path.startsWith('/ot-fde/roster/');
  if (adminOnly && !req.user.isAdmin) {
    return res.status(403).json({ success: false, error: 'Administrator access is required.' });
  }
  next();
});
app.get('/api/auth/me', (req, res) => res.json({ success: true, user: req.user }));
app.post('/api/auth/logout', (req, res) => {
  sessions.revoke(req, res);
  res.json({ success: true });
});

// Default file path provided by user
const DEFAULT_FILE_PATH = 'C:/Users/utjja/OneDrive/Pictures/Diesel Consumption all vechicle (Autosaved).xlsx';
const DEFAULT_WELL_SITE_FILE = 'C:/Users/utjja/Downloads/ONGC WELL SITE/well site info.xlsx';
const DEFAULT_MAINTENANCE_FILE = 'C:/Users/utjja/OneDrive/Pictures/All vehicle  document Details and Maintaince.xlsx';
const LOCAL_MAINTENANCE_FILE = path.join(__dirname, 'data', 'All vehicle  document Details and Maintaince.xlsx');

// In-memory data store initialized with default data
let activeData = {
  vehicles: [],
  dieselIssuedRecords: [],
  loadedFile: null,
  lastUpdated: null
};

// In-memory store for ONGC Well Sites & Clusters
let wellSiteData = {
  fields: [],
  clusters: [],
  wells: [],
  totalClusters: 0,
  totalWells: 0,
  loadedFile: null,
  lastUpdated: null
};

// In-memory store for Vehicle Documents & Maintenance
let maintenanceData = {
  vehicles: [],
  maintenanceRecords: [],
  summary: {
    totalVehicles: 0,
    totalMaintenanceServices: 0,
    totalValidDocs: 0,
    totalExpiringSoon: 0,
    totalExpired: 0
  },
  loadedFile: null,
  lastUpdated: null
};

// In-memory store for OT & FDE
let otFdeData = {
  roster: { ...DEFAULT_ROSTER },
  jobs: [],
  lastUpdated: null
};

async function loadDefaultOtFdeData() {
  try {
    console.log('Loading OT and FDE database...');
    const parsed = await initOtFdeDatabase();
    otFdeData = {
      ...parsed,
      lastUpdated: new Date().toISOString()
    };
    console.log(`Successfully loaded ${otFdeData.jobs.length} OT/FDE jobs and ${Object.keys(otFdeData.roster).length} employees.`);
  } catch (e) {
    console.error('Failed to initialize OT/FDE database:', e);
  }
}

const OPERATIONS_PATH = path.join(DATA_DIR, 'operations_store.json');
const savedOperations = readOperationsStore(OPERATIONS_PATH);
if (savedOperations) {
  activeData = savedOperations.activeData || activeData;
  wellSiteData = savedOperations.wellSiteData || wellSiteData;
  maintenanceData = savedOperations.maintenanceData || maintenanceData;
}

// Enterprise Backup Manager & Disaster Recovery
const backupManager = createBackupManager({
  dataDir: DATA_DIR,
  getDataSnapshot: () => ({
    users: loadUsersDb(),
    otFde: otFdeData,
    operations: { activeData, wellSiteData, maintenanceData },
    adminRequests: loadAdminRequests()
  }),
  restoreDataSnapshot: (snapshot) => {
    if (snapshot.users) {
      usersDb = snapshot.users;
      saveUsersDb(usersDb);
    }
    if (snapshot.otFde) {
      otFdeData = snapshot.otFde;
      saveOtFdeDatabase(otFdeData).catch(e => console.error('Failed to save restored OT/FDE:', e));
    }
    if (snapshot.operations) {
      if (snapshot.operations.activeData) activeData = snapshot.operations.activeData;
      if (snapshot.operations.wellSiteData) wellSiteData = snapshot.operations.wellSiteData;
      if (snapshot.operations.maintenanceData) maintenanceData = snapshot.operations.maintenanceData;
      try { writeOperationsStore(OPERATIONS_PATH, { activeData, wellSiteData, maintenanceData }); } catch (_) {}
    }
    if (snapshot.adminRequests) {
      try { saveAdminRequests(snapshot.adminRequests); } catch (_) {}
    }
  },
  logAudit: (action, userId, details) => {
    try {
      appendAuditLog(usersDb, action, userId, details);
      saveUsersDb(usersDb);
    } catch (_) {}
  }
});

// Run automated backup scheduler every minute
setInterval(() => {
  try { backupManager.checkAndRunScheduledBackups(); } catch (e) { console.error('Backup scheduler error:', e); }
}, 60000);

// Initialize PostgreSQL connection pool (non-blocking)
initPostgresPool().catch(err => {
  console.log('[PostgreSQL] Standby mode (Local HA store active):', err.message);
});
app.use('/api', (req, res, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method) || req.path.endsWith('/load-default')) {
    const sendJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode < 400 && body?.success) {
        try { writeOperationsStore(OPERATIONS_PATH, { activeData, wellSiteData, maintenanceData }); }
        catch (error) { res.status(500); return sendJson({ success: false, error: `Could not save changes: ${error.message}` }); }
      }
      return sendJson(body);
    };
  }
  next();
});

// Auto-load helpers
async function loadDefaultMaintenanceData() {
  const targetPath = fs.existsSync(DEFAULT_MAINTENANCE_FILE)
    ? DEFAULT_MAINTENANCE_FILE
    : (fs.existsSync(LOCAL_MAINTENANCE_FILE) ? LOCAL_MAINTENANCE_FILE : null);

  if (targetPath) {
    try {
      console.log(`Loading maintenance data from: ${targetPath}`);
      const parsed = await parseVehicleDocumentsAndMaintenance(targetPath);
      maintenanceData = {
        ...parsed,
        loadedFile: 'All vehicle  document Details and Maintaince.xlsx',
        lastUpdated: new Date().toISOString()
      };
      console.log(`Successfully loaded ${maintenanceData.vehicles.length} vehicle documents and ${maintenanceData.maintenanceRecords.length} maintenance records.`);
    } catch (e) {
      console.error('Failed to parse maintenance file:', e);
    }
  } else {
    console.warn(`Maintenance file not found.`);
  }
}
async function loadDefaultData() {
  if (fs.existsSync(DEFAULT_FILE_PATH)) {
    try {
      console.log(`Loading initial data from: ${DEFAULT_FILE_PATH}`);
      const parsed = await parseWorkbook(DEFAULT_FILE_PATH);
      activeData = {
        ...parsed,
        loadedFile: 'Diesel Consumption all vechicle (Autosaved).xlsx',
        lastUpdated: new Date().toISOString()
      };
      console.log(`Successfully loaded ${activeData.vehicles.length} vehicles.`);
    } catch (e) {
      console.error('Failed to parse default file:', e);
    }
  } else {
    console.warn(`Default file not found at ${DEFAULT_FILE_PATH}`);
  }
}

async function loadDefaultWellSites() {
  if (fs.existsSync(DEFAULT_WELL_SITE_FILE)) {
    try {
      console.log(`Loading well site info from: ${DEFAULT_WELL_SITE_FILE}`);
      const parsed = await parseWellSiteInfo(DEFAULT_WELL_SITE_FILE);
      wellSiteData = {
        ...parsed,
        loadedFile: 'well site info.xlsx',
        lastUpdated: new Date().toISOString()
      };
      console.log(`Successfully loaded ${wellSiteData.totalWells} wells across ${wellSiteData.totalClusters} clusters.`);
    } catch (e) {
      console.error('Failed to parse well site info:', e);
    }
  } else {
    console.warn(`Well site info file not found at ${DEFAULT_WELL_SITE_FILE}`);
  }
}

// ============================================================
// API ROUTES
// ============================================================

// ============================================================
// 0. Authentication Routes
// ============================================================

app.post('/api/auth/login', (req, res) => {
  const { userId, password } = req.body;
  if (!userId || !password) {
    return res.status(400).json({ success: false, error: 'User ID and Password are required.' });
  }

  const cleanUser = String(userId).trim().toUpperCase();
  const cleanPass = String(password);

  // Reload db for latest registrations
  usersDb = loadUsersDb();

  // Find user by userId (case-insensitive) or CPF alias
  const matched = usersDb.users.find(u => {
    const uUpper = String(u.userId).toUpperCase();
    if (uUpper === cleanUser) return true;
    // Support CPF number without prefix
    if (u.cpf && String(u.cpf).toUpperCase() === cleanUser) return true;
    // Legacy aliases for CPF-140751
    if (uUpper === 'CPF-140751' && ['140751', 'CPF140751', 'UTJJAL CHETIA', 'UTJJAL.CHUTIA'].includes(cleanUser)) return true;
    return false;
  });

  if (!matched) {
    appendAuditLog(usersDb, 'LOGIN_FAILED', userId, { reason: 'User not found', ip: req.ip });
    saveUsersDb(usersDb);
    return res.status(401).json({ success: false, error: 'User ID not found. Please register or contact admin.' });
  }

  if (matched.status === 'inactive' || matched.status === 'suspended') {
    appendAuditLog(usersDb, 'LOGIN_BLOCKED', matched.userId, { reason: 'Account suspended/inactive', ip: req.ip });
    saveUsersDb(usersDb);
    return res.status(403).json({ success: false, error: 'Your account is suspended. Contact the administrator.' });
  }

  const isPasswordValid = verifyPassword(cleanPass, matched.passwordHash);

  if (!isPasswordValid) {
    appendAuditLog(usersDb, 'LOGIN_FAILED', matched.userId, { reason: 'Wrong password', ip: req.ip });
    saveUsersDb(usersDb);
    return res.status(401).json({ success: false, error: 'Incorrect password. Please try again.' });
  }

  sessions.issue(req, res, matched, !!req.body.rememberMe);

  // Update last login
  matched.lastLogin = new Date().toISOString();
  appendAuditLog(usersDb, 'LOGIN_SUCCESS', matched.userId, { name: matched.name, ip: req.ip });
  saveUsersDb(usersDb);

  res.json({
    success: true,
    message: `Welcome back, ${matched.name}!`,
    user: {
      userId: matched.userId,
      name: matched.name,
      role: matched.role,
      initials: matched.initials || (matched.name ? matched.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() : 'U'),
      isAdmin: !!matched.isAdmin,
      department: matched.department || '',
      location: matched.location || ''
    }
  });
});

// Verify CPF in crew roster and check if already registered
app.get('/api/auth/verify-cpf', (req, res) => {
  try {
    const queryCpf = String(req.query.cpf || '').trim();
    if (!queryCpf) {
      return res.status(400).json({ success: false, error: 'CPF number is required.' });
    }

    const roster = (otFdeData && otFdeData.roster) ? otFdeData.roster : {};
    const crewMember = Object.values(roster).find(emp =>
      emp.cpf && String(emp.cpf).trim().toUpperCase() === queryCpf.toUpperCase()
    );

    if (!crewMember) {
      return res.json({
        success: true,
        valid: false,
        error: `CPF "${queryCpf}" is NOT in the authorized ONGC Crew Roster. Only crew members added by Admin can register.`
      });
    }

    usersDb = loadUsersDb();
    const alreadyRegistered = usersDb.users.find(u =>
      u.cpf && String(u.cpf).trim().toUpperCase() === queryCpf.toUpperCase()
    );

    if (alreadyRegistered) {
      return res.json({
        success: true,
        valid: true,
        alreadyRegistered: true,
        userId: alreadyRegistered.userId,
        name: alreadyRegistered.name,
        error: `CPF "${queryCpf}" (${alreadyRegistered.name}) is ALREADY registered with User ID "${alreadyRegistered.userId}". Each crew member can register only once.`
      });
    }

    return res.json({
      success: true,
      valid: true,
      alreadyRegistered: false,
      crew: {
        code: crewMember.code,
        cpf: crewMember.cpf,
        name: crewMember.name,
        designation: crewMember.designation,
        section: crewMember.section || 'SST',
        location: crewMember.location || 'JORHAT'
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Register a new user account (Strictly Gated by ONGC Crew Roster CPF - One Time Only)
app.post('/api/auth/register', (req, res) => {
  try {
    const { userId, password, confirmPassword, name, role, cpf, department, location, dob } = req.body;

    const cleanCpf = String(cpf || '').trim();
    if (!cleanCpf) {
      return res.status(400).json({ success: false, error: 'Official ONGC CPF number is required for registration.' });
    }

    const cleanDob = String(dob || '').trim();
    if (!cleanDob) {
      return res.status(400).json({ success: false, error: 'Date of Birth (DOB) is required for registration & password reset security.' });
    }

    if (!userId || !password) {
      return res.status(400).json({ success: false, error: 'User ID and Password are required.' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, error: 'Passwords do not match.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.' });
    }

    // 1. Verify CPF is listed in the authorized Crew Roster
    const roster = (otFdeData && otFdeData.roster) ? otFdeData.roster : {};
    const crewMember = Object.values(roster).find(emp =>
      emp.cpf && String(emp.cpf).trim().toUpperCase() === cleanCpf.toUpperCase()
    );

    if (!crewMember) {
      return res.status(403).json({
        success: false,
        error: `Registration Denied: CPF "${cleanCpf}" was not found in the authorized ONGC Crew Roster. Only crew members added by Admin can register. Please contact Administrator.`
      });
    }

    // 2. Check if this CPF is already registered (One-time registration only)
    usersDb = loadUsersDb();
    const alreadyRegistered = usersDb.users.find(u =>
      u.cpf && String(u.cpf).trim().toUpperCase() === cleanCpf.toUpperCase()
    );
    if (alreadyRegistered) {
      return res.status(409).json({
        success: false,
        error: `Registration Denied: CPF "${cleanCpf}" (${alreadyRegistered.name}) is ALREADY registered with User ID "${alreadyRegistered.userId}". Each crew member can register ONE TIME ONLY. Please sign in.`
      });
    }

    const cleanId = String(userId).trim().toUpperCase();
    const existingId = usersDb.users.find(u => String(u.userId).toUpperCase() === cleanId);
    if (existingId) {
      return res.status(400).json({ success: false, error: `User ID "${cleanId}" is already taken. Please choose another User ID.` });
    }

    // Default to roster details if empty or match roster
    const finalName = (name && name.trim()) ? name.trim().toUpperCase() : crewMember.name;
    const finalRole = (role && role.trim()) ? role.trim() : (crewMember.designation || 'Crew Member');
    const finalDept = (department && department.trim()) ? department.trim().toUpperCase() : (crewMember.section || 'SST');
    const finalLoc = (location && location.trim()) ? location.trim().toUpperCase() : (crewMember.location || 'JORHAT');

    const nameParts = finalName.split(' ');
    const initials = nameParts.length >= 2
      ? (nameParts[0][0] + nameParts[nameParts.length - 1][0])
      : nameParts[0].substring(0, 2);

    const newUser = {
      userId: cleanId,
      passwordHash: hashPassword(password),
      savedPassword: password,
      dob: cleanDob,
      name: finalName,
      role: finalRole,
      initials: initials.toUpperCase(),
      cpf: cleanCpf,
      department: finalDept,
      location: finalLoc,
      crewCode: crewMember.code,
      isAdmin: false,
      status: 'active',
      registeredAt: new Date().toISOString(),
      registeredBy: 'SELF_REGISTRATION_ROSTER_VERIFIED',
      lastLogin: null
    };

    usersDb.users.push(newUser);
    appendAuditLog(usersDb, 'USER_REGISTERED', cleanId, {
      name: newUser.name,
      cpf: cleanCpf,
      role: newUser.role,
      crewCode: crewMember.code,
      ip: req.ip
    });
    saveUsersDb(usersDb);

    res.json({
      success: true,
      message: `Account registered successfully! Welcome, ${newUser.name}. You can now sign in with your credentials.`,
      user: {
        userId: newUser.userId,
        name: newUser.name,
        role: newUser.role,
        initials: newUser.initials,
        isAdmin: false
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Registration failed: ' + err.message });
  }
});

// Reset Password via Date of Birth (DOB)
app.post('/api/auth/reset-password-dob', (req, res) => {
  try {
    const { userId, dob, newPassword, confirmPassword } = req.body;
    if (!userId || !dob || !newPassword) {
      return res.status(400).json({ success: false, error: 'User ID / CPF, Date of Birth, and New Password are required.' });
    }
    if (confirmPassword !== undefined && newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, error: 'Passwords do not match.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.' });
    }

    usersDb = loadUsersDb();
    const cleanUser = String(userId).trim().toUpperCase();
    const user = usersDb.users.find(u => {
      const uUpper = String(u.userId).toUpperCase();
      if (uUpper === cleanUser) return true;
      if (u.cpf && String(u.cpf).toUpperCase() === cleanUser) return true;
      if (uUpper === 'CPF-140751' && ['140751', 'CPF140751'].includes(cleanUser)) return true;
      return false;
    });

    if (!user) {
      return res.status(404).json({ success: false, error: `User ID or CPF "${userId}" not found in system.` });
    }

    // Normalizing dates for flexible matching (e.g. YYYY-MM-DD)
    const normReqDob = String(dob).trim().split('T')[0];
    const userDob = user.dob ? String(user.dob).trim().split('T')[0] : '';

    if (!userDob) {
      return res.status(400).json({
        success: false,
        error: 'Date of Birth is not registered for this account. Please contact Administrator to set your DOB or reset password.'
      });
    }

    if (normReqDob !== userDob) {
      appendAuditLog(usersDb, 'PASSWORD_RESET_FAILED', user.userId, { reason: 'Incorrect DOB', ip: req.ip });
      saveUsersDb(usersDb);
      return res.status(403).json({
        success: false,
        error: 'Date of Birth does not match the official record for this account.'
      });
    }

    user.passwordHash = hashPassword(newPassword);
    user.savedPassword = newPassword;
    appendAuditLog(usersDb, 'PASSWORD_RESET_SUCCESS', user.userId, { method: 'DOB_VERIFICATION', ip: req.ip });
    saveUsersDb(usersDb);

    res.json({
      success: true,
      message: `Password reset successfully for ${user.name}! You can now sign in with your new password.`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Password reset failed: ' + err.message });
  }
});

// Get all registered users (admin only)
app.get('/api/auth/users', (req, res) => {
  try {
    usersDb = loadUsersDb();
    const safeUsers = usersDb.users.map(u => ({
      userId: u.userId,
      name: u.name,
      role: u.role,
      initials: u.initials,
      cpf: u.cpf,
      dob: u.dob || '',
      savedPassword: u.savedPassword || (u.userId === 'admin' ? 'TestPass123' : (u.userId === 'CPF-140751' ? 'TestPass123' : '••••••••')),
      department: u.department,
      location: u.location,
      crewCode: u.crewCode || '',
      isAdmin: !!u.isAdmin,
      status: u.status || 'active',
      registeredAt: u.registeredAt,
      registeredBy: u.registeredBy,
      lastLogin: u.lastLogin
    }));
    res.json({ success: true, users: safeUsers, total: safeUsers.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update user password and/or DOB (Admin only)
app.put('/api/auth/users/:userId/password', (req, res) => {
  try {
    const targetId = String(req.params.userId).toUpperCase();
    const { newPassword, dob } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'New password must be at least 6 characters.' });
    }

    usersDb = loadUsersDb();
    const user = usersDb.users.find(u => String(u.userId).toUpperCase() === targetId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    user.passwordHash = hashPassword(newPassword);
    user.savedPassword = newPassword;
    if (dob) {
      user.dob = String(dob).trim();
    }

    appendAuditLog(usersDb, 'ADMIN_PASSWORD_CHANGED', targetId, {
      changedBy: req.user?.userId || 'ADMIN',
      hasDob: Boolean(user.dob),
      ip: req.ip
    });
    saveUsersDb(usersDb);

    res.json({
      success: true,
      message: `Password for ${user.name} (${user.userId}) updated successfully!`,
      savedPassword: user.savedPassword,
      dob: user.dob
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update user status (admin: activate/suspend)
app.put('/api/auth/users/:userId/status', (req, res) => {
  try {
    const targetId = String(req.params.userId).toUpperCase();
    const { status } = req.body;
    if (!['active', 'inactive', 'suspended'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status. Use: active, inactive, suspended.' });
    }
    usersDb = loadUsersDb();
    const user = usersDb.users.find(u => String(u.userId).toUpperCase() === targetId);
    if (!user) return res.status(404).json({ success: false, error: 'User not found.' });
    if (user.isAdmin && status !== 'active') {
      return res.status(403).json({ success: false, error: 'Administrator accounts cannot be deactivated.' });
    }
    user.status = status;
    appendAuditLog(usersDb, 'USER_STATUS_CHANGED', targetId, { newStatus: status, ip: req.ip });
    saveUsersDb(usersDb);
    res.json({ success: true, message: `User ${targetId} status updated to "${status}".` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete user account (Admin only)
app.delete('/api/auth/users/:userId', (req, res) => {
  try {
    const targetId = String(req.params.userId).toUpperCase();
    if (['CPF-140751', 'ADMIN'].includes(targetId)) {
      return res.status(403).json({ success: false, error: 'Root administrator accounts cannot be deleted.' });
    }
    usersDb = loadUsersDb();
    const index = usersDb.users.findIndex(u => String(u.userId).toUpperCase() === targetId);
    if (index === -1) return res.status(404).json({ success: false, error: 'User not found.' });

    const deleted = usersDb.users.splice(index, 1)[0];
    appendAuditLog(usersDb, 'USER_DELETED', targetId, { name: deleted.name, cpf: deleted.cpf, ip: req.ip });
    saveUsersDb(usersDb);
    res.json({ success: true, message: `User ${deleted.name} (${targetId}) removed successfully.` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// DATABASE & AUTO-BACKUP MANAGEMENT (ADMIN ONLY)
// ============================================================

// 1. Get Database Status & Statistics
app.get('/api/admin/database/status', (req, res) => {
  try {
    const currentUsers = loadUsersDb();
    const pgStatus = getPostgresStatus();
    const backupCfg = backupManager.loadConfig();

    const stats = {
      usersCount: currentUsers.users?.length || 0,
      auditLogCount: currentUsers.auditLog?.length || 0,
      otFdeJobsCount: otFdeData.jobs?.length || 0,
      rosterCount: Object.keys(otFdeData.roster || {}).length || 0,
      vehiclesCount: (maintenanceData.vehicles?.length || 0) + (activeData.vehicles?.length || 0),
      wellsCount: wellSiteData.wells?.length || 0,
      clustersCount: wellSiteData.clusters?.length || 0,
      maintenanceRecordsCount: maintenanceData.maintenanceRecords?.length || 0,
      activeBatchesCount: (activeData.vehicles || []).reduce((acc, v) => acc + (v.batches?.length || 0), 0)
    };

    res.json({
      success: true,
      postgres: pgStatus,
      stats,
      backupConfig: backupCfg
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Live Database Table Records Viewer
app.get('/api/admin/database/table/:tableName', (req, res) => {
  try {
    const { tableName } = req.params;
    const search = String(req.query.search || '').trim().toLowerCase();
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
    const offset = Math.max(parseInt(req.query.offset || '0', 10), 0);

    let rows = [];
    let columns = [];

    const currentUsers = loadUsersDb();

    switch (tableName) {
      case 'users':
        columns = ['userId', 'name', 'role', 'cpf', 'dob', 'department', 'location', 'isAdmin', 'status', 'registeredAt', 'lastLogin'];
        rows = (currentUsers.users || []).map(u => ({ ...u, passwordHash: '••••••••' }));
        break;

      case 'audit_log':
        columns = ['id', 'timestamp', 'action', 'userId', 'details'];
        rows = [...(currentUsers.auditLog || [])].reverse();
        break;

      case 'ot_fde_jobs':
        columns = ['id', 'date', 'month', 'location', 'workType', 'startTime', 'endTime', 'dutyHours', 'otHours', 'fdShifts', 'otAmount', 'fdAmount', 'totalClaim'];
        rows = otFdeData.jobs || [];
        break;

      case 'roster':
        columns = ['code', 'name', 'designation', 'cpf', 'otRate', 'basicPay', 'da', 'status'];
        rows = Object.values(otFdeData.roster || {});
        break;

      case 'vehicles':
        columns = ['vehicleId', 'vehicleName', 'vehicleType', 'tax', 'insurance', 'pollution', 'permit'];
        rows = maintenanceData.vehicles || [];
        break;

      case 'well_sites':
        columns = ['wellName', 'clusterName', 'fieldName', 'zone', 'status', 'type'];
        rows = wellSiteData.wells || [];
        break;

      default:
        return res.status(400).json({ success: false, error: `Invalid table "${tableName}". Allowed: users, audit_log, ot_fde_jobs, roster, vehicles, well_sites.` });
    }

    if (search) {
      rows = rows.filter(row => {
        return Object.values(row).some(val => {
          if (val === null || val === undefined) return false;
          if (typeof val === 'object') return JSON.stringify(val).toLowerCase().includes(search);
          return String(val).toLowerCase().includes(search);
        });
      });
    }

    const totalCount = rows.length;
    const paginated = rows.slice(offset, offset + limit);

    res.json({
      success: true,
      tableName,
      columns,
      totalCount,
      limit,
      offset,
      rows: paginated
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Test PostgreSQL Connection
app.post('/api/admin/database/test-connection', async (req, res) => {
  try {
    const { connectionString, host, port, database, user, password } = req.body;
    let config;
    if (connectionString) {
      config = { connectionString };
    } else {
      config = {
        host: host || 'localhost',
        port: parseInt(port || '5432', 10),
        database: database || 'ongc_operations',
        user: user || 'postgres',
        password: password || ''
      };
    }
    const result = await testPgConnection(config);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Download Full PostgreSQL .sql Dump
app.get('/api/admin/database/sql-dump', (req, res) => {
  try {
    const snapshot = {
      users: loadUsersDb(),
      otFde: otFdeData,
      operations: { activeData, wellSiteData, maintenanceData }
    };
    const sqlContent = generateSqlDump(snapshot);
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `ongc_postgres_dump_${dateStr}.sql`;

    res.setHeader('Content-Type', 'application/sql');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(sqlContent);
  } catch (err) {
    res.status(500).json({ success: false, error: 'SQL dump export failed: ' + err.message });
  }
});

// 5. Get Backup Configuration (Daily & Weekly Switches)
app.get('/api/admin/database/backups/config', (req, res) => {
  try {
    const config = backupManager.loadConfig();
    res.json({ success: true, config });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Update Backup Configuration (Toggle Daily/Weekly Switches)
app.post('/api/admin/database/backups/config', (req, res) => {
  try {
    const {
      dailyBackupEnabled,
      dailyBackupTime,
      weeklyBackupEnabled,
      weeklyBackupDay,
      weeklyBackupTime,
      retentionDays
    } = req.body;

    const current = backupManager.loadConfig();
    const updated = {
      ...current,
      dailyBackupEnabled: dailyBackupEnabled !== undefined ? Boolean(dailyBackupEnabled) : current.dailyBackupEnabled,
      dailyBackupTime: dailyBackupTime || current.dailyBackupTime,
      weeklyBackupEnabled: weeklyBackupEnabled !== undefined ? Boolean(weeklyBackupEnabled) : current.weeklyBackupEnabled,
      weeklyBackupDay: weeklyBackupDay || current.weeklyBackupDay,
      weeklyBackupTime: weeklyBackupTime || current.weeklyBackupTime,
      retentionDays: retentionDays !== undefined ? parseInt(retentionDays, 10) : current.retentionDays
    };

    backupManager.saveConfig(updated);
    appendAuditLog(usersDb, 'BACKUP_CONFIG_UPDATED', req.user?.userId || 'ADMIN', {
      dailyEnabled: updated.dailyBackupEnabled,
      weeklyEnabled: updated.weeklyBackupEnabled
    });
    saveUsersDb(usersDb);

    res.json({
      success: true,
      message: 'Auto-backup schedule settings saved successfully.',
      config: updated
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Create Instant Backup
app.post('/api/admin/database/backups/create', (req, res) => {
  try {
    const { label } = req.body || {};
    const result = backupManager.createBackup({ type: 'MANUAL', label: label || 'INSTANT' });
    if (!result.success) {
      return res.status(500).json({ success: false, error: result.error });
    }
    res.json({
      success: true,
      message: 'Database backup snapshot created successfully!',
      backup: result.backup
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. List All Backup Files
app.get('/api/admin/database/backups', (req, res) => {
  try {
    const backups = backupManager.listBackups();
    res.json({ success: true, backups, total: backups.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. Download a Backup File
app.get('/api/admin/database/backups/:filename/download', (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = backupManager.getBackupFilePath(filename);
    if (!filePath) {
      return res.status(404).json({ success: false, error: 'Backup file not found.' });
    }
    res.download(filePath, filename);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 10. Restore from a Backup File
app.post('/api/admin/database/backups/:filename/restore', (req, res) => {
  try {
    const { filename } = req.params;
    const result = backupManager.restoreBackup(filename);
    if (!result.success) {
      return res.status(500).json({ success: false, error: result.error });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 11. Delete a Backup File
app.delete('/api/admin/database/backups/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const result = backupManager.deleteBackup(filename);
    if (!result.success) {
      return res.status(500).json({ success: false, error: result.error });
    }
    res.json({ success: true, message: `Backup "${filename}" deleted successfully.` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get audit log
app.get('/api/auth/audit', (req, res) => {
  try {
    usersDb = loadUsersDb();
    const limit = parseInt(req.query.limit) || 200;
    const filterAction = req.query.action;
    let logs = usersDb.auditLog || [];
    if (filterAction && filterAction !== 'ALL') {
      logs = logs.filter(l => l.action === filterAction);
    }
    res.json({ success: true, auditLog: logs.slice(0, limit), total: logs.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// ADMIN APPROVAL QUEUE & CREW REQUESTS
// ============================================================

// Get all crew requests (filter by ?status=pending|approved|rejected|all)
app.get('/api/admin/requests', (req, res) => {
  try {
    const store = loadAdminRequests();
    const filterStatus = String(req.query.status || 'all').toLowerCase();
    let list = store.requests || [];
    if (filterStatus !== 'all') {
      list = list.filter(r => (r.status || '').toLowerCase() === filterStatus);
    }
    list.sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));
    const pendingCount = (store.requests || []).filter(r => r.status === 'pending').length;
    res.json({ success: true, requests: list, total: list.length, pendingCount });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Submit a new crew request (Add, Delete, or Promotion) - goes to pending queue for Admin approval
app.post('/api/admin/requests', (req, res) => {
  try {
    const { type, employeeCode, employeeName, cpf, payload, requestedBy, reason } = req.body;
    if (!type || !['CREW_ADD', 'CREW_DELETE', 'CREW_PROMOTE'].includes(type)) {
      return res.status(400).json({ success: false, error: 'Invalid request type. Must be CREW_ADD, CREW_DELETE, or CREW_PROMOTE.' });
    }

    const store = loadAdminRequests();
    const newReq = {
      id: `REQ_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      type,
      status: 'pending',
      employeeCode: (employeeCode || payload?.code || '').toUpperCase(),
      employeeName: (employeeName || payload?.name || '').toUpperCase(),
      cpf: (cpf || payload?.cpf || '').trim(),
      payload: payload || {},
      reason: reason || '',
      requestedBy: req.user.name,
      requestedAt: new Date().toISOString(),
      reviewedBy: null,
      reviewedAt: null,
      reviewRemarks: null
    };

    store.requests.unshift(newReq);
    saveAdminRequests(store);

    usersDb = loadUsersDb();
    appendAuditLog(usersDb, 'CREW_REQUEST_SUBMITTED', req.user.userId, {
      requestId: newReq.id,
      type,
      employee: newReq.employeeName,
      code: newReq.employeeCode,
      reason
    });
    saveUsersDb(usersDb);

    res.json({
      success: true,
      message: `Request for ${type} submitted successfully! Awaiting Admin approval.`,
      request: newReq
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin approves a crew request (executes the change and updates roster)
app.put('/api/admin/requests/:id/approve', (req, res) => {
  try {
    const reqId = req.params.id;
    const store = loadAdminRequests();
    const item = store.requests.find(r => r.id === reqId);
    if (!item) return res.status(404).json({ success: false, error: 'Request not found.' });
    if (item.status !== 'pending') {
      return res.status(400).json({ success: false, error: `Request is already ${item.status}.` });
    }

    const reviewer = req.user.name;
    const remarks = req.body.remarks || 'Approved by Operations Admin';

    // Execute the action based on type
    if (item.type === 'CREW_ADD') {
      const p = item.payload;
      const code = (p.code || item.employeeCode).trim().toUpperCase();
      const basic = parseFloat(p.basicPay) || 28230;
      const dearness = parseFloat(p.da) || 14002;
      const fd = parseFloat(p.fdRate) || 450;
      const otRate = calculateOtRate(basic, dearness);

      otFdeData.roster[code] = {
        code,
        cpf: (p.cpf || item.cpf || '').trim(),
        name: (p.name || item.employeeName).trim().toUpperCase(),
        designation: (p.designation || 'CREW').trim().toUpperCase(),
        section: (p.section || 'SST').trim().toUpperCase(),
        location: (p.location || 'JORHAT').trim().toUpperCase(),
        basicPay: basic,
        da: dearness,
        fdRate: fd,
        otRate,
        status: 'active',
        dateAdded: new Date().toISOString().slice(0, 10)
      };
      otFdeData.lastUpdated = new Date().toISOString();
      saveOtFdeDatabase(otFdeData);

    } else if (item.type === 'CREW_DELETE') {
      const code = item.employeeCode.toUpperCase();
      if (otFdeData.roster[code]) {
        delete otFdeData.roster[code];
        otFdeData.lastUpdated = new Date().toISOString();
        saveOtFdeDatabase(otFdeData);
      }

    } else if (item.type === 'CREW_PROMOTE') {
      const code = item.employeeCode.toUpperCase();
      const emp = otFdeData.roster[code];
      if (!emp) {
        return res.status(404).json({ success: false, error: `Employee ${code} not found in roster.` });
      }

      const p = item.payload;
      const prevDesignation = emp.designation || '';
      const prevBasic = emp.basicPay || 0;
      const targetBasic = p.newBasicPay ? parseFloat(p.newBasicPay) : Math.ceil((prevBasic * 1.03) / 10) * 10;

      emp.designation = (p.newDesignation || prevDesignation).trim().toUpperCase();
      emp.basicPay = targetBasic;
      emp.otRate = calculateOtRate(emp.basicPay, emp.da);

      if (!emp.promotionHistory) emp.promotionHistory = [];
      const promoRecord = {
        date: p.promotionDate || new Date().toISOString().slice(0, 10),
        orderNo: p.orderNo || `ONGC/SST/PROM/${new Date().getFullYear()}/${code}`,
        fromDesignation: prevDesignation,
        toDesignation: emp.designation,
        fromBasic: prevBasic,
        toBasic: emp.basicPay,
        basicIncrement: Math.max(0, emp.basicPay - prevBasic),
        otRateOld: calculateOtRate(prevBasic, emp.da),
        otRateNew: emp.otRate,
        remarks: p.remarks || remarks || `Promoted to ${emp.designation}`
      };
      emp.promotionHistory.unshift(promoRecord);
      emp.lastPromotion = promoRecord;

      otFdeData.lastUpdated = new Date().toISOString();
      saveOtFdeDatabase(otFdeData);
    }

    item.status = 'approved';
    item.reviewedBy = reviewer;
    item.reviewedAt = new Date().toISOString();
    item.reviewRemarks = remarks;
    saveAdminRequests(store);

    usersDb = loadUsersDb();
    appendAuditLog(usersDb, 'CREW_REQUEST_APPROVED', reviewer, {
      requestId: item.id,
      type: item.type,
      employee: item.employeeName,
      code: item.employeeCode,
      remarks
    });
    saveUsersDb(usersDb);

    res.json({
      success: true,
      message: `Request for ${item.employeeName} (${item.type}) successfully APPROVED and applied to Roster!`,
      request: item,
      roster: otFdeData.roster
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin rejects a crew request
app.put('/api/admin/requests/:id/reject', (req, res) => {
  try {
    const reqId = req.params.id;
    const store = loadAdminRequests();
    const item = store.requests.find(r => r.id === reqId);
    if (!item) return res.status(404).json({ success: false, error: 'Request not found.' });
    if (item.status !== 'pending') {
      return res.status(400).json({ success: false, error: `Request is already ${item.status}.` });
    }

    const reviewer = req.user.name;
    const remarks = req.body.remarks || 'Rejected by Operations Admin';

    item.status = 'rejected';
    item.reviewedBy = reviewer;
    item.reviewedAt = new Date().toISOString();
    item.reviewRemarks = remarks;
    saveAdminRequests(store);

    usersDb = loadUsersDb();
    appendAuditLog(usersDb, 'CREW_REQUEST_REJECTED', reviewer, {
      requestId: item.id,
      type: item.type,
      employee: item.employeeName,
      code: item.employeeCode,
      remarks
    });
    saveUsersDb(usersDb);

    res.json({
      success: true,
      message: `Request for ${item.employeeName} (${item.type}) has been REJECTED.`,
      request: item
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Direct Admin Crew Add (Instant execution by Admin)
app.post('/api/admin/crew/direct-add', (req, res) => {
  try {
    let { code, name, cpf, designation, basicPay, da, fdRate, section, location, adminUser } = req.body;
    if (!code || !name || !designation) {
      return res.status(400).json({ success: false, error: 'Employee Code, Full Name, and Designation are required.' });
    }
    code = code.trim().toUpperCase();
    if (otFdeData.roster[code]) {
      return res.status(400).json({ success: false, error: `Employee code '${code}' already exists in the roster.` });
    }

    const basic = parseFloat(basicPay) || 28230;
    const dearness = parseFloat(da) || 14002;
    const fd = parseFloat(fdRate) || 450;
    const otRate = calculateOtRate(basic, dearness);

    const newEmp = {
      code,
      cpf: (cpf || '').trim(),
      name: name.trim().toUpperCase(),
      designation: designation.trim().toUpperCase(),
      section: (section || 'SST').trim().toUpperCase(),
      location: (location || 'JORHAT').trim().toUpperCase(),
      basicPay: basic,
      da: dearness,
      fdRate: fd,
      otRate,
      status: 'active',
      dateAdded: new Date().toISOString().slice(0, 10)
    };

    otFdeData.roster[code] = newEmp;
    otFdeData.lastUpdated = new Date().toISOString();
    saveOtFdeDatabase(otFdeData);

    usersDb = loadUsersDb();
    appendAuditLog(usersDb, 'ADMIN_CREW_ADD', req.user.userId, {
      name: newEmp.name,
      code,
      cpf: newEmp.cpf,
      designation: newEmp.designation
    });
    saveUsersDb(usersDb);

    res.json({
      success: true,
      message: `Employee ${newEmp.name} (${code}) directly added to Roster by Admin.`,
      employee: newEmp,
      roster: otFdeData.roster
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Direct Admin Crew Promote (Instant execution by Admin)
app.post('/api/admin/crew/:code/direct-promote', (req, res) => {
  try {
    const code = req.params.code.toUpperCase();
    const emp = otFdeData.roster[code];
    if (!emp) return res.status(404).json({ success: false, error: `Employee ${code} not found in roster.` });

    const { newDesignation, newBasicPay, promotionalIncrementPct, orderNo, remarks, promotionDate, adminUser } = req.body;
    const prevDesignation = emp.designation || '';
    const prevBasic = emp.basicPay || 0;

    let targetBasic = prevBasic;
    if (newBasicPay !== undefined && newBasicPay !== null && !isNaN(parseFloat(newBasicPay))) {
      targetBasic = parseFloat(newBasicPay);
    } else if (promotionalIncrementPct) {
      const pct = parseFloat(promotionalIncrementPct) || 3.0;
      targetBasic = Math.ceil((prevBasic * (1 + pct / 100)) / 10) * 10;
    } else {
      targetBasic = Math.ceil((prevBasic * 1.03) / 10) * 10;
    }

    emp.designation = (newDesignation || prevDesignation).trim().toUpperCase();
    emp.basicPay = targetBasic;
    emp.otRate = calculateOtRate(emp.basicPay, emp.da);

    if (!emp.promotionHistory) emp.promotionHistory = [];
    const promoRecord = {
      date: promotionDate || new Date().toISOString().slice(0, 10),
      orderNo: orderNo || `ONGC/SST/PROM/${new Date().getFullYear()}/${code}`,
      fromDesignation: prevDesignation,
      toDesignation: emp.designation,
      fromBasic: prevBasic,
      toBasic: emp.basicPay,
      basicIncrement: Math.max(0, emp.basicPay - prevBasic),
      otRateOld: calculateOtRate(prevBasic, emp.da),
      otRateNew: emp.otRate,
      remarks: remarks || `Promoted to ${emp.designation} by Admin`
    };
    emp.promotionHistory.unshift(promoRecord);
    emp.lastPromotion = promoRecord;

    otFdeData.lastUpdated = new Date().toISOString();
    saveOtFdeDatabase(otFdeData);

    usersDb = loadUsersDb();
    appendAuditLog(usersDb, 'ADMIN_CREW_PROMOTE', req.user.userId, {
      name: emp.name,
      code,
      from: prevDesignation,
      to: emp.designation,
      newBasic: emp.basicPay
    });
    saveUsersDb(usersDb);

    res.json({
      success: true,
      message: `🎉 ${emp.name} (${code}) successfully promoted to ${emp.designation}! New Basic: ₹${emp.basicPay.toLocaleString('en-IN')}, OT Rate: ₹${emp.otRate}/hr`,
      employee: emp,
      roster: otFdeData.roster
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Direct Admin Crew Delete (Instant execution by Admin)
app.delete('/api/admin/crew/:code/direct-delete', (req, res) => {
  try {
    const code = req.params.code.toUpperCase();
    if (!otFdeData.roster[code]) {
      return res.status(404).json({ success: false, error: `Employee ${code} not found in roster.` });
    }
    const removedName = otFdeData.roster[code].name;
    const removedCpf = otFdeData.roster[code].cpf;
    delete otFdeData.roster[code];
    otFdeData.lastUpdated = new Date().toISOString();
    saveOtFdeDatabase(otFdeData);

    usersDb = loadUsersDb();
    appendAuditLog(usersDb, 'ADMIN_CREW_DELETE', req.user.userId, {
      name: removedName,
      code,
      cpf: removedCpf
    });
    saveUsersDb(usersDb);

    res.json({
      success: true,
      message: `Employee ${removedName} (${code}) has been permanently deleted from roster by Admin.`,
      roster: otFdeData.roster
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 1. Get current fleet data
app.get('/api/data', (req, res) => {
  const summarized = calculateFleetSummary(activeData.vehicles);
  res.json({
    success: true,
    vehicles: summarized.vehicles,
    fleetSummary: summarized.fleetSummary,
    dieselIssuedRecords: activeData.dieselIssuedRecords,
    loadedFile: activeData.loadedFile,
    lastUpdated: activeData.lastUpdated
  });
});

// 2. Explicitly trigger loading default file
app.get('/api/load-default', async (req, res) => {
  try {
    if (!fs.existsSync(DEFAULT_FILE_PATH)) {
      return res.status(404).json({ success: false, error: 'Default file not found on server disk.' });
    }
    const parsed = await parseWorkbook(DEFAULT_FILE_PATH);
    activeData = {
      ...parsed,
      loadedFile: 'Diesel Consumption all vechicle (Autosaved).xlsx',
      lastUpdated: new Date().toISOString()
    };
    const summarized = calculateFleetSummary(activeData.vehicles);
    res.json({
      success: true,
      message: 'Default ONGC Excel data loaded successfully!',
      vehicles: summarized.vehicles,
      fleetSummary: summarized.fleetSummary,
      dieselIssuedRecords: activeData.dieselIssuedRecords,
      loadedFile: activeData.loadedFile
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Upload new Excel file
app.post('/api/upload', upload.single('excelFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No Excel file provided.' });
    }
    const filePath = req.file.path;
    const parsed = await parseWorkbook(filePath);
    activeData = {
      ...parsed,
      loadedFile: req.file.originalname,
      lastUpdated: new Date().toISOString()
    };
    const summarized = calculateFleetSummary(activeData.vehicles);
    res.json({
      success: true,
      message: `Parsed ${activeData.vehicles.length} vehicles from uploaded file.`,
      vehicles: summarized.vehicles,
      fleetSummary: summarized.fleetSummary,
      dieselIssuedRecords: activeData.dieselIssuedRecords,
      loadedFile: activeData.loadedFile
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to process Excel file: ' + err.message });
  }
});

// 4. Add new Trip Log Entry
app.post('/api/entry', (req, res) => {
  try {
    const { vehicleId, batchId, date, details, distance, job, engineHours, remarks } = req.body;
    const vehicle = activeData.vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return res.status(404).json({ success: false, error: 'Vehicle not found' });

    let batch = vehicle.batches.find(b => b.id === batchId);
    if (!batch && vehicle.batches.length > 0) {
      // default to last batch
      batch = vehicle.batches[vehicle.batches.length - 1];
    }
    if (!batch) {
      return res.status(400).json({ success: false, error: 'No batch available for this vehicle. Please create an indent batch first.' });
    }

    const newEntry = {
      id: `${batch.id}-e${Date.now()}`,
      date: date || new Date().toISOString().slice(0, 10),
      details: details || '',
      distance: parseFloat(distance) || 0,
      job: job || '',
      engineHours: parseFloat(engineHours) || 0,
      remarks: remarks || ''
    };

    batch.entries.push(newEntry);
    Object.assign(batch, calculateBatchMetrics(batch));
    activeData.lastUpdated = new Date().toISOString();

    const summarized = calculateFleetSummary(activeData.vehicles);
    res.json({ success: true, entry: newEntry, vehicles: summarized.vehicles, fleetSummary: summarized.fleetSummary });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Update an existing Trip Log Entry
app.put('/api/entry', (req, res) => {
  try {
    const { vehicleId, batchId, entryId, date, details, distance, job, engineHours, remarks } = req.body;
    const vehicle = activeData.vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return res.status(404).json({ success: false, error: 'Vehicle not found' });

    const batch = vehicle.batches.find(b => b.id === batchId);
    if (!batch) return res.status(404).json({ success: false, error: 'Batch not found' });

    const entry = batch.entries.find(e => e.id === entryId);
    if (!entry) return res.status(404).json({ success: false, error: 'Entry not found' });

    entry.date = date !== undefined ? date : entry.date;
    entry.details = details !== undefined ? details : entry.details;
    entry.distance = distance !== undefined ? parseFloat(distance) : entry.distance;
    entry.job = job !== undefined ? job : entry.job;
    entry.engineHours = engineHours !== undefined ? parseFloat(engineHours) : entry.engineHours;
    entry.remarks = remarks !== undefined ? remarks : entry.remarks;

    Object.assign(batch, calculateBatchMetrics(batch));
    activeData.lastUpdated = new Date().toISOString();

    const summarized = calculateFleetSummary(activeData.vehicles);
    res.json({ success: true, entry, vehicles: summarized.vehicles, fleetSummary: summarized.fleetSummary });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Delete a Trip Log Entry
app.delete('/api/entry', (req, res) => {
  try {
    const { vehicleId, batchId, entryId } = req.query;
    const vehicle = activeData.vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return res.status(404).json({ success: false, error: 'Vehicle not found' });

    const batch = vehicle.batches.find(b => b.id === batchId);
    if (!batch) return res.status(404).json({ success: false, error: 'Batch not found' });

    const initialLen = batch.entries.length;
    batch.entries = batch.entries.filter(e => e.id !== entryId);
    if (batch.entries.length === initialLen) {
      return res.status(404).json({ success: false, error: 'Entry not found' });
    }

    Object.assign(batch, calculateBatchMetrics(batch));
    activeData.lastUpdated = new Date().toISOString();

    const summarized = calculateFleetSummary(activeData.vehicles);
    res.json({ success: true, vehicles: summarized.vehicles, fleetSummary: summarized.fleetSummary });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Add a new Indent / Batch to a vehicle
app.post('/api/batch', (req, res) => {
  try {
    const { vehicleId, year, issueDate, issuedQty, truckAvg, engineAvg, remarks } = req.body;
    const vehicle = activeData.vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return res.status(404).json({ success: false, error: 'Vehicle not found' });

    const batchNumber = vehicle.batches.length + 1;
    const newBatch = {
      id: `${vehicleId}-b${Date.now()}`,
      batchNumber,
      vehicleId,
      year: year || '2024-25',
      issueDate: issueDate || new Date().toISOString().slice(0, 10),
      issuedQty: parseFloat(issuedQty) || 0,
      truckAvg: parseFloat(truckAvg) || 3.0,
      engineAvg: parseFloat(engineAvg) || 4.0,
      entries: [],
      remarks: remarks || ''
    };

    vehicle.batches.push(calculateBatchMetrics(newBatch));
    activeData.lastUpdated = new Date().toISOString();

    const summarized = calculateFleetSummary(activeData.vehicles);
    res.json({ success: true, batch: newBatch, vehicles: summarized.vehicles, fleetSummary: summarized.fleetSummary });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. Update Batch Settings (rates, qty, date)
app.put('/api/batch-settings', (req, res) => {
  try {
    const { vehicleId, batchId, issuedQty, truckAvg, engineAvg, issueDate, year } = req.body;
    const vehicle = activeData.vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return res.status(404).json({ success: false, error: 'Vehicle not found' });

    const batch = vehicle.batches.find(b => b.id === batchId);
    if (!batch) return res.status(404).json({ success: false, error: 'Batch not found' });

    if (issuedQty !== undefined) batch.issuedQty = parseFloat(issuedQty);
    if (truckAvg !== undefined) batch.truckAvg = parseFloat(truckAvg);
    if (engineAvg !== undefined) batch.engineAvg = parseFloat(engineAvg);
    if (issueDate !== undefined) batch.issueDate = issueDate;
    if (year !== undefined) batch.year = year;

    Object.assign(batch, calculateBatchMetrics(batch));
    activeData.lastUpdated = new Date().toISOString();

    const summarized = calculateFleetSummary(activeData.vehicles);
    res.json({ success: true, batch, vehicles: summarized.vehicles, fleetSummary: summarized.fleetSummary });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. Register a new Vehicle
app.post('/api/vehicle', (req, res) => {
  try {
    const { name, type } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Vehicle registration name is required' });
    }
    const cleanName = name.trim().toUpperCase();
    const id = cleanName.replace(/[^A-Z0-9]/g, '-');

    if (activeData.vehicles.some(v => v.id === id || v.name === cleanName)) {
      return res.status(400).json({ success: false, error: 'A vehicle with this registration already exists' });
    }

    const defaultBatch = {
      id: `${id}-b1`,
      batchNumber: 1,
      vehicleId: id,
      year: '2024-25',
      issueDate: new Date().toISOString().slice(0, 10),
      issuedQty: 200,
      truckAvg: 3,
      engineAvg: 4,
      entries: [],
      remarks: ''
    };

    const newVehicle = {
      id,
      name: cleanName,
      type: type || 'Reservoir Winch',
      batches: [calculateBatchMetrics(defaultBatch)]
    };

    activeData.vehicles.push(newVehicle);
    activeData.lastUpdated = new Date().toISOString();

    const summarized = calculateFleetSummary(activeData.vehicles);
    res.json({ success: true, vehicle: newVehicle, vehicles: summarized.vehicles, fleetSummary: summarized.fleetSummary });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 10. Export to Excel (.xlsx)
app.get('/api/export/excel', async (req, res) => {
  try {
    const buffer = await generateExcelWorkbook(activeData);
    const filename = `ONGC_Diesel_Consumption_${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ success: false, error: 'Excel export error: ' + err.message });
  }
});

// 11. Export to PDF (.pdf)
app.get('/api/export/pdf', async (req, res) => {
  try {
    const { vehicleId, batchId } = req.query;
    const pdfBuffer = await generatePdfReport(activeData, { vehicleId, batchId });
    const filePrefix = vehicleId ? `ONGC_${vehicleId}` : 'ONGC_Fleet_Diesel_Report';
    const filename = `${filePrefix}_${new Date().toISOString().slice(0, 10)}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ success: false, error: 'PDF export error: ' + err.message });
  }
});

// 12. Get Well Sites Directory
app.get('/api/well-sites', (req, res) => {
  res.json({
    success: true,
    ...wellSiteData
  });
});

// 13. Reload Default Well Sites file
app.get('/api/well-sites/load-default', async (req, res) => {
  try {
    if (!fs.existsSync(DEFAULT_WELL_SITE_FILE)) {
      return res.status(404).json({ success: false, error: 'Well site info file not found on disk.' });
    }
    const parsed = await parseWellSiteInfo(DEFAULT_WELL_SITE_FILE);
    wellSiteData = {
      ...parsed,
      loadedFile: 'well site info.xlsx',
      lastUpdated: new Date().toISOString()
    };
    res.json({
      success: true,
      message: `Loaded ${wellSiteData.totalWells} wells across ${wellSiteData.totalClusters} clusters.`,
      ...wellSiteData
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to parse well site info: ' + err.message });
  }
});

// 14. Upload Custom Well Sites file
app.post('/api/well-sites/upload', upload.single('wellSiteFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No well site file uploaded.' });
    }
    const parsed = await parseWellSiteInfo(req.file.path);
    wellSiteData = {
      ...parsed,
      loadedFile: req.file.originalname,
      lastUpdated: new Date().toISOString()
    };
    res.json({
      success: true,
      message: `Parsed ${wellSiteData.totalWells} wells from uploaded file.`,
      ...wellSiteData
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to process well site file: ' + err.message });
  }
});

// 15. Add New Cluster / Well Site
app.post('/api/well-sites/cluster', (req, res) => {
  try {
    const { field, clusterName, wells } = req.body;
    if (!clusterName || !clusterName.trim()) {
      return res.status(400).json({ success: false, error: 'Cluster name is required.' });
    }
    const cleanField = (field || 'GENERAL').trim().toUpperCase();
    const cleanCluster = clusterName.trim().toUpperCase();
    
    let parsedWells = [];
    if (Array.isArray(wells)) {
      parsedWells = wells.map(w => String(w).trim().toUpperCase()).filter(Boolean);
    } else if (typeof wells === 'string') {
      parsedWells = wells.split(/[,;\n]+/).map(w => w.trim().toUpperCase()).filter(Boolean);
    }

    const newCluster = {
      id: `cluster-${Date.now()}`,
      field: cleanField,
      clusterName: cleanCluster,
      wells: parsedWells,
      rawText: parsedWells.join(', ')
    };

    const updatedClusters = [...(wellSiteData.clusters || []), newCluster];
    wellSiteData = rebuildWellSiteStructure(updatedClusters, wellSiteData.loadedFile || 'User Modified');

    res.json({
      success: true,
      message: `Cluster ${cleanCluster} added with ${parsedWells.length} wells!`,
      ...wellSiteData
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 16. Update Cluster / Well Site
app.put('/api/well-sites/cluster', (req, res) => {
  try {
    const { id, field, clusterName, wells } = req.body;
    if (!id) {
      return res.status(400).json({ success: false, error: 'Cluster ID is required.' });
    }
    const cluster = (wellSiteData.clusters || []).find(c => c.id === id);
    if (!cluster) {
      return res.status(404).json({ success: false, error: 'Cluster not found.' });
    }

    if (field !== undefined) cluster.field = field.trim().toUpperCase();
    if (clusterName !== undefined) cluster.clusterName = clusterName.trim().toUpperCase();

    if (wells !== undefined) {
      let parsedWells = [];
      if (Array.isArray(wells)) {
        parsedWells = wells.map(w => String(w).trim().toUpperCase()).filter(Boolean);
      } else if (typeof wells === 'string') {
        parsedWells = wells.split(/[,;\n]+/).map(w => w.trim().toUpperCase()).filter(Boolean);
      }
      cluster.wells = parsedWells;
      cluster.rawText = parsedWells.join(', ');
    }

    wellSiteData = rebuildWellSiteStructure(wellSiteData.clusters, wellSiteData.loadedFile || 'User Modified');

    res.json({
      success: true,
      message: `Cluster ${cluster.clusterName} updated successfully!`,
      ...wellSiteData
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 17. Delete Cluster
app.delete('/api/well-sites/cluster', (req, res) => {
  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ success: false, error: 'Cluster ID is required.' });
    }
    const initialCount = (wellSiteData.clusters || []).length;
    const filteredClusters = (wellSiteData.clusters || []).filter(c => c.id !== id);
    if (filteredClusters.length === initialCount) {
      return res.status(404).json({ success: false, error: 'Cluster not found.' });
    }

    wellSiteData = rebuildWellSiteStructure(filteredClusters, wellSiteData.loadedFile || 'User Modified');

    res.json({
      success: true,
      message: 'Cluster deleted successfully.',
      ...wellSiteData
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 18. Get Vehicle Documents & Maintenance Data
app.get('/api/maintenance', (req, res) => {
  res.json({
    success: true,
    ...maintenanceData
  });
});

// 19. Add Maintenance Record
app.post('/api/maintenance/record', (req, res) => {
  try {
    const { vehicleId, date, description, category, cost, partsReplaced, serviceCenter } = req.body;
    if (!vehicleId || !description) {
      return res.status(400).json({ success: false, error: 'Vehicle and Description are required.' });
    }

    const vId = normalizeVehicleId(vehicleId);
    const isoDate = date || new Date().toISOString().substring(0, 10);
    const cat = category || detectMaintenanceCategory(description);

    const newRecord = {
      id: `maint_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      vehicleId: vId,
      vehicleName: vId,
      date: isoDate,
      dateFormatted: formatDateDisplay(isoDate),
      description: description.trim(),
      category: cat,
      cost: cost ? parseFloat(cost) : null,
      partsReplaced: partsReplaced ? partsReplaced.trim() : null,
      serviceCenter: serviceCenter ? serviceCenter.trim() : 'Central Workshop'
    };

    maintenanceData.maintenanceRecords.unshift(newRecord);
    maintenanceData.summary.totalMaintenanceServices = maintenanceData.maintenanceRecords.length;
    maintenanceData.lastUpdated = new Date().toISOString();

    res.json({
      success: true,
      message: `Maintenance record logged for ${vId}!`,
      record: newRecord,
      ...maintenanceData
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 20. Update Maintenance Record
app.put('/api/maintenance/record/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { vehicleId, date, description, category, cost, partsReplaced, serviceCenter } = req.body;

    const record = maintenanceData.maintenanceRecords.find(r => r.id === id);
    if (!record) {
      return res.status(404).json({ success: false, error: 'Maintenance record not found.' });
    }

    if (vehicleId) {
      const vId = normalizeVehicleId(vehicleId);
      record.vehicleId = vId;
      record.vehicleName = vId;
    }
    if (date) {
      record.date = date;
      record.dateFormatted = formatDateDisplay(date);
    }
    if (description !== undefined) {
      record.description = description.trim();
      record.category = category || detectMaintenanceCategory(record.description);
    }
    if (category) {
      record.category = category;
    }
    if (cost !== undefined) {
      record.cost = cost ? parseFloat(cost) : null;
    }
    if (partsReplaced !== undefined) {
      record.partsReplaced = partsReplaced ? partsReplaced.trim() : null;
    }
    if (serviceCenter !== undefined) {
      record.serviceCenter = serviceCenter ? serviceCenter.trim() : null;
    }

    maintenanceData.lastUpdated = new Date().toISOString();

    res.json({
      success: true,
      message: 'Maintenance record updated successfully!',
      record,
      ...maintenanceData
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 21. Delete Maintenance Record
app.delete('/api/maintenance/record/:id', (req, res) => {
  try {
    const { id } = req.params;
    const initialLen = maintenanceData.maintenanceRecords.length;
    maintenanceData.maintenanceRecords = maintenanceData.maintenanceRecords.filter(r => r.id !== id);

    if (maintenanceData.maintenanceRecords.length === initialLen) {
      return res.status(404).json({ success: false, error: 'Maintenance record not found.' });
    }

    maintenanceData.summary.totalMaintenanceServices = maintenanceData.maintenanceRecords.length;
    maintenanceData.lastUpdated = new Date().toISOString();

    res.json({
      success: true,
      message: 'Maintenance record deleted successfully.',
      ...maintenanceData
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 22. Update / Renew Vehicle Documents
app.put('/api/maintenance/documents/:vehicleId', (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { tax, pollution, insurance, permit } = req.body;

    const vId = normalizeVehicleId(vehicleId);
    const vehicle = maintenanceData.vehicles.find(v => v.vehicleId === vId);

    if (!vehicle) {
      return res.status(404).json({ success: false, error: `Vehicle ${vId} not found in document records.` });
    }

    if (tax !== undefined) {
      vehicle.tax = tax || null;
      vehicle.taxFormatted = formatDateDisplay(vehicle.tax);
      vehicle.taxStatus = calculateDocStatus(vehicle.tax);
    }
    if (pollution !== undefined) {
      vehicle.pollution = pollution || null;
      vehicle.pollutionFormatted = formatDateDisplay(vehicle.pollution);
      vehicle.pollutionStatus = calculateDocStatus(vehicle.pollution);
    }
    if (insurance !== undefined) {
      vehicle.insurance = insurance || null;
      vehicle.insuranceFormatted = formatDateDisplay(vehicle.insurance);
      vehicle.insuranceStatus = calculateDocStatus(vehicle.insurance);
    }
    if (permit !== undefined) {
      vehicle.permit = permit || null;
      vehicle.permitFormatted = formatDateDisplay(vehicle.permit);
      vehicle.permitStatus = calculateDocStatus(vehicle.permit);
    }

    // Recompute summary
    let totalValidDocs = 0, totalExpiringSoon = 0, totalExpired = 0;
    maintenanceData.vehicles.forEach(v => {
      [v.taxStatus, v.pollutionStatus, v.insuranceStatus, v.permitStatus].forEach(st => {
        if (st.status === 'valid') totalValidDocs++;
        if (st.status === 'expiring_soon') totalExpiringSoon++;
        if (st.status === 'expired') totalExpired++;
      });
    });

    maintenanceData.summary.totalValidDocs = totalValidDocs;
    maintenanceData.summary.totalExpiringSoon = totalExpiringSoon;
    maintenanceData.summary.totalExpired = totalExpired;
    maintenanceData.lastUpdated = new Date().toISOString();

    res.json({
      success: true,
      message: `Documents for ${vId} updated successfully!`,
      vehicle,
      ...maintenanceData
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 23. Reload Default Maintenance File
app.get('/api/maintenance/load-default', async (req, res) => {
  try {
    await loadDefaultMaintenanceData();
    res.json({
      success: true,
      message: 'Vehicle document details and maintenance records reloaded successfully!',
      ...maintenanceData
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 24. Upload Maintenance Excel File
app.post('/api/maintenance/upload', upload.single('maintenanceFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No Excel file uploaded.' });
    }

    console.log(`Processing uploaded maintenance file: ${req.file.path}`);
    const parsed = await parseVehicleDocumentsAndMaintenance(req.file.path);
    maintenanceData = {
      ...parsed,
      loadedFile: req.file.originalname,
      lastUpdated: new Date().toISOString()
    };

    res.json({
      success: true,
      message: `Successfully loaded ${req.file.originalname}!`,
      ...maintenanceData
    });
  } catch (err) {
    res.status(500).json({ success: false, error: `Failed to parse file: ${err.message}` });
  }
});

// ============================================================
// 25-33. OVERTIME (OT) & FIELD DUTY EXPENDITURE (FDE) API
// ============================================================

// 25. Get all OT & FDE data (roster, jobs, summaries)
app.get(['/api/ot-fde/data', '/api/ot-fde'], (req, res) => {
  res.json({
    success: true,
    roster: otFdeData.roster,
    jobs: otFdeData.jobs,
    lastUpdated: otFdeData.lastUpdated
  });
});

// 26. Calculate Live Preview for Entry Form
app.post('/api/ot-fde/preview', (req, res) => {
  try {
    const { depTime, arrTime, isHoliday, manualOtHours, crewCodes } = req.body;
    const calcs = calculateDutyAndOt(depTime || '08:30', arrTime || '16:30', {
      isHoliday,
      manualOtHours
    });

    const crewDetails = (crewCodes || []).map(code => {
      const emp = otFdeData.roster[code] || { code, name: code, otRate: 400 };
      const otAmount = Math.round(calcs.otHours * emp.otRate * 100) / 100;
      return {
        code,
        name: emp.name,
        cpf: emp.cpf,
        designation: emp.designation,
        basicPay: emp.basicPay,
        otHours: calcs.otHours,
        otRate: emp.otRate,
        otAmount,
        fdAmount: calcs.fdAmount
      };
    });

    res.json({
      success: true,
      preview: {
        ...calcs,
        crewCount: (crewCodes || []).length,
        isCrewCountValid: (crewCodes || []).length >= 4 && (crewCodes || []).length <= 10,
        crewDetails
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 27. Log a new Field Job (Single Entry -> Dual OT + FDE allocation)
app.post('/api/ot-fde/job', (req, res) => {
  try {
    const {
      date,
      location,
      fieldLocation,
      wellSite,
      vehicle,
      depTime,
      arrTime,
      crewCodes: rawCrewCodes,
      crew,
      jobDescription,
      wellRemarks,
      remarks,
      isHoliday,
      manualOtHours,
      winchMovement
    } = req.body;
    const crewCodes = Array.isArray(rawCrewCodes) && rawCrewCodes.length > 0 ? rawCrewCodes : (Array.isArray(crew) ? crew : []);

    const finalLocation = (fieldLocation && wellSite)
      ? `${fieldLocation.trim().toUpperCase()} - ${wellSite.trim().toUpperCase()}`
      : String(location || fieldLocation || wellSite || '').toUpperCase().trim();

    if (!date || !finalLocation || !depTime || !arrTime) {
      return res.status(400).json({ success: false, error: 'Date, Location / Well Site, Departure, and Arrival times are required.' });
    }

    if (!crewCodes || crewCodes.length < 4 || crewCodes.length > 10) {
      return res.status(400).json({ success: false, error: 'Please select between 4 to 10 crew members for this job.' });
    }

    const finalRemarks = (wellRemarks || remarks || '').trim();
    const finalJobDesc = (jobDescription || 'WELL OPERATION').toUpperCase().trim();

    const cleanVehicle = (vehicle && vehicle !== 'N/A' && vehicle !== 'None') ? String(vehicle).trim() : '';

    const allocated = allocateJobToCrew({
      id: `JOB-${String(date).replace(/[^0-9]/g, '')}-${Date.now().toString().slice(-4)}`,
      date,
      location: finalLocation,
      fieldLocation: fieldLocation || '',
      wellSite: wellSite || '',
      vehicle: cleanVehicle,
      depTime,
      arrTime,
      crewCodes,
      jobDescription: finalJobDesc,
      wellRemarks: finalRemarks,
      remarks: finalRemarks,
      isHoliday: !!isHoliday,
      manualOtHours,
      winchMovement: cleanVehicle ? (winchMovement || null) : null
    }, otFdeData.roster);

    // Automatic Vehicle HSD Log entry integration (Single Entry -> Dual System Update, only if vehicle selected)
    if (cleanVehicle && activeData?.vehicles && winchMovement) {
      try {
        const normVeh = String(cleanVehicle).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        const matchedVeh = activeData.vehicles.find(v =>
          v.id === cleanVehicle ||
          v.registrationNumber === cleanVehicle ||
          String(v.id).replace(/[^a-zA-Z0-9]/g, '').toUpperCase() === normVeh ||
          String(v.registrationNumber).replace(/[^a-zA-Z0-9]/g, '').toUpperCase() === normVeh
        );

        if (matchedVeh && matchedVeh.batches && matchedVeh.batches.length > 0) {
          const latestBatch = matchedVeh.batches[matchedVeh.batches.length - 1];
          const movementDist = winchMovement.isStandby ? 0 : (parseFloat(winchMovement.distance) || 0);
          const engineHours = parseFloat(winchMovement.engineHours) || 3.0;
          const hsdRemarks = winchMovement.hsdRemarks || '';

          const kmDetail = winchMovement.isStandby
            ? 'STANDBY'
            : (winchMovement.startKm ? `KM: ${winchMovement.startKm}➔${winchMovement.stopKm}` : '');

          const combinedLogRemarks = [kmDetail, hsdRemarks, finalRemarks].filter(Boolean).join(' | ');

          latestBatch.entries.push({
            id: `${latestBatch.id}-e${Date.now()}`,
            date: date || new Date().toISOString().slice(0, 10),
            details: `${finalLocation} (${finalJobDesc})`,
            distance: movementDist,
            job: finalJobDesc,
            engineHours: engineHours,
            remarks: combinedLogRemarks
          });
          Object.assign(latestBatch, calculateBatchMetrics(latestBatch));
          activeData.lastUpdated = new Date().toISOString();
        }
      } catch (logErr) {
        console.warn('Auto vehicle log entry note:', logErr.message);
      }
    }

    // Prepend new job to store
    otFdeData.jobs.unshift(allocated);
    otFdeData.lastUpdated = new Date().toISOString();
    saveOtFdeDatabase(otFdeData);

    res.json({
      success: true,
      message: cleanVehicle
        ? `Field job logged successfully! Allocated to ${allocated.crewCount} crew members & recorded in Vehicle Log.`
        : `Field job logged successfully! Allocated to ${allocated.crewCount} crew members (no vehicle unit assigned).`,
      job: allocated
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 28. Edit an existing Field Job
app.put('/api/ot-fde/job/:id', (req, res) => {
  try {
    const { id } = req.params;
    const idx = otFdeData.jobs.findIndex(j => j.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: 'Job not found.' });
    }

    const current = otFdeData.jobs[idx];
    const updated = allocateJobToCrew({
      ...current,
      ...req.body,
      memberAllocations: current.memberAllocations,
      id
    }, otFdeData.roster);

    otFdeData.jobs[idx] = updated;
    otFdeData.lastUpdated = new Date().toISOString();
    saveOtFdeDatabase(otFdeData);

    res.json({
      success: true,
      message: `Job ${id} updated successfully!`,
      job: updated
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 29. Delete a Field Job
app.delete('/api/ot-fde/job/:id', (req, res) => {
  try {
    const { id } = req.params;
    const initialLen = otFdeData.jobs.length;
    otFdeData.jobs = otFdeData.jobs.filter(j => j.id !== id);

    if (otFdeData.jobs.length === initialLen) {
      return res.status(404).json({ success: false, error: 'Job not found.' });
    }

    otFdeData.lastUpdated = new Date().toISOString();
    saveOtFdeDatabase(otFdeData);

    res.json({
      success: true,
      message: `Job ${id} deleted successfully!`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 30. Get Monthly Statement for OT and FDE
app.get('/api/ot-fde/statement', (req, res) => {
  try {
    const month = req.query.month || '2025-01';
    const employeeCode = (req.query.employee || req.query.empCode || 'UC').toUpperCase();
    const type = (req.query.type || 'all').toLowerCase();

    const statements = generateMonthlyStatements(otFdeData.jobs, otFdeData.roster, month);

    if (type === 'ot') {
      const empStatement = statements.ot[employeeCode] || null;
      return res.json({ success: true, statement: empStatement, all: statements.ot });
    } else if (type === 'fde') {
      const empStatement = statements.fde[employeeCode] || null;
      return res.json({ success: true, statement: empStatement, all: statements.fde });
    }

    res.json({
      success: true,
      month,
      employeeCode,
      otStatement: statements.ot[employeeCode] || null,
      fdeStatement: statements.fde[employeeCode] || null,
      allOt: statements.ot,
      allFde: statements.fde
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 30b. Get Yearly Statement for OT and FDE (Year-wise)
app.get('/api/ot-fde/yearly-statement', (req, res) => {
  try {
    const year = req.query.year || '2025';
    const employeeCode = (req.query.employee || req.query.empCode || 'ALL').toUpperCase();

    const yearlyData = generateYearlyStatements(otFdeData.jobs, otFdeData.roster, year);

    let specificEmployee = null;
    if (employeeCode !== 'ALL') {
      specificEmployee = yearlyData.employees.find(e => e.code === employeeCode) || null;
    }

    res.json({
      success: true,
      year: yearlyData.year,
      availableYears: yearlyData.availableYears,
      summary: yearlyData.summary,
      months: yearlyData.months,
      employees: yearlyData.employees,
      employeeCode,
      specificEmployee
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 30c. Export Yearly Excel Report
app.get('/api/ot-fde/export/yearly-excel', async (req, res) => {
  try {
    const year = req.query.year || '2025';
    const yearlyData = generateYearlyStatements(otFdeData.jobs, otFdeData.roster, year);
    const excelBuffer = await generateYearlyExcel(yearlyData);

    const filename = `ONGC_ANNUAL_OVERTIME_REPORT_${year}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(excelBuffer);
  } catch (err) {
    res.status(500).json({ success: false, error: `Failed to export yearly Excel: ${err.message}` });
  }
});

// 31. Update Employee Profile / Pay in Roster & Person-wise Promotion
app.put('/api/ot-fde/employee/:code', (req, res) => {
  try {
    const code = req.params.code.toUpperCase();
    if (!otFdeData.roster[code]) {
      return res.status(404).json({ success: false, error: `Employee ${code} not found in roster.` });
    }

    const { basicPay, da, designation, cpf, name, isPromotion, promotionDate, promotionOrder, promotionRemarks } = req.body;
    const emp = otFdeData.roster[code];

    const prevDesignation = emp.designation || '';
    const prevBasicPay = emp.basicPay || 0;

    if (name) emp.name = name.trim();
    if (cpf) emp.cpf = cpf.trim();
    if (designation) emp.designation = designation.trim().toUpperCase();
    if (basicPay !== undefined) emp.basicPay = parseFloat(basicPay) || emp.basicPay;
    if (da !== undefined) emp.da = parseFloat(da) || emp.da;

    // Recalculate OT rate as per Mines Act
    emp.otRate = calculateOtRate(emp.basicPay, emp.da);

    // Track Promotion History if marked as promotion
    if (isPromotion) {
      if (!emp.promotionHistory) emp.promotionHistory = [];
      const promoRecord = {
        date: promotionDate || new Date().toISOString().slice(0, 10),
        orderNo: promotionOrder || `ONGC/SST/PROM/${new Date().getFullYear()}/${code}`,
        fromDesignation: prevDesignation,
        toDesignation: emp.designation,
        fromBasic: prevBasicPay,
        toBasic: emp.basicPay,
        basicIncrement: Math.max(0, emp.basicPay - prevBasicPay),
        otRateOld: calculateOtRate(prevBasicPay, emp.da),
        otRateNew: emp.otRate,
        remarks: promotionRemarks || `Promoted from ${prevDesignation} to ${emp.designation}`
      };
      emp.promotionHistory.unshift(promoRecord);
      emp.lastPromotion = promoRecord;
    }

    saveOtFdeDatabase(otFdeData);

    const message = isPromotion
      ? `🎉 Congratulations! ${emp.name} (${code}) successfully promoted to ${emp.designation}! New Mines Act OT Rate: ₹${emp.otRate}/hr`
      : `Employee ${emp.name} (${code}) profile and pay updated successfully! OT Rate: ₹${emp.otRate}/hr`;

    res.json({
      success: true,
      message,
      employee: emp,
      roster: otFdeData.roster
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 31a. Dedicated Person-wise Promotion Endpoint
app.post('/api/ot-fde/employee/:code/promote', (req, res) => {
  try {
    const code = req.params.code.toUpperCase();
    if (!otFdeData.roster[code]) {
      return res.status(404).json({ success: false, error: `Employee ${code} not found in roster.` });
    }

    const { newDesignation, newBasicPay, promotionalIncrementPct, orderNo, remarks, promotionDate } = req.body;
    const emp = otFdeData.roster[code];

    const prevDesignation = emp.designation || '';
    const prevBasic = emp.basicPay || 0;

    let targetBasic = prevBasic;
    if (newBasicPay !== undefined && newBasicPay !== null && !isNaN(parseFloat(newBasicPay))) {
      targetBasic = parseFloat(newBasicPay);
    } else if (promotionalIncrementPct) {
      const pct = parseFloat(promotionalIncrementPct) || 3.0;
      targetBasic = Math.ceil((prevBasic * (1 + pct / 100)) / 10) * 10;
    } else {
      // Default ONGC 3% promotion increment
      targetBasic = Math.ceil((prevBasic * 1.03) / 10) * 10;
    }

    emp.designation = (newDesignation || prevDesignation).trim().toUpperCase();
    emp.basicPay = targetBasic;
    emp.otRate = calculateOtRate(emp.basicPay, emp.da);

    if (!emp.promotionHistory) emp.promotionHistory = [];
    const promoRecord = {
      date: promotionDate || new Date().toISOString().slice(0, 10),
      orderNo: orderNo || `ONGC/SST/PROM/${new Date().getFullYear()}/${code}`,
      fromDesignation: prevDesignation,
      toDesignation: emp.designation,
      fromBasic: prevBasic,
      toBasic: emp.basicPay,
      basicIncrement: emp.basicPay - prevBasic,
      otRateOld: calculateOtRate(prevBasic, emp.da),
      otRateNew: emp.otRate,
      remarks: remarks || `Promoted to ${emp.designation}`
    };
    emp.promotionHistory.unshift(promoRecord);
    emp.lastPromotion = promoRecord;

    saveOtFdeDatabase(otFdeData);

    res.json({
      success: true,
      message: `🎉 ${emp.name} (${code}) successfully promoted to ${emp.designation}! New Basic Pay: ₹${emp.basicPay.toLocaleString('en-IN')}, OT Rate: ₹${emp.otRate}/hr`,
      employee: emp,
      roster: otFdeData.roster
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 31c. Add New Person to Roster
app.post('/api/ot-fde/employee', (req, res) => {
  try {
    let { code, name, cpf, designation, basicPay, da, fdRate, section, location } = req.body;

    if (!code || !name || !designation) {
      return res.status(400).json({ success: false, error: 'Employee Code, Full Name, and Official Designation are required.' });
    }

    code = code.trim().toUpperCase();
    if (otFdeData.roster[code]) {
      return res.status(400).json({ success: false, error: `Employee code '${code}' already exists in the roster.` });
    }

    const basic = parseFloat(basicPay) || 28230;
    const dearness = parseFloat(da) || 14002;
    const fd = parseFloat(fdRate) || 450;
    const otRate = calculateOtRate(basic, dearness);

    const newEmp = {
      code,
      cpf: (cpf || '').trim(),
      name: name.trim().toUpperCase(),
      designation: designation.trim().toUpperCase(),
      section: (section || 'SST').trim().toUpperCase(),
      location: (location || 'JORHAT').trim().toUpperCase(),
      basicPay: basic,
      da: dearness,
      fdRate: fd,
      otRate,
      status: 'active',
      dateAdded: new Date().toISOString().slice(0, 10)
    };

    otFdeData.roster[code] = newEmp;
    otFdeData.lastUpdated = new Date().toISOString();
    saveOtFdeDatabase(otFdeData);

    res.json({
      success: true,
      message: `Employee ${newEmp.name} (${code}) successfully added to Roster! Mines Act OT Rate: ₹${otRate}/hr`,
      employee: newEmp,
      roster: otFdeData.roster
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 31d. Retire or Reactivate Employee
app.put('/api/ot-fde/employee/:code/retire', (req, res) => {
  try {
    const code = req.params.code.toUpperCase();
    const emp = otFdeData.roster[code];
    if (!emp) {
      return res.status(404).json({ success: false, error: `Employee ${code} not found in roster.` });
    }

    const { status, retirementDate, retirementRemarks } = req.body;
    const newStatus = status === 'active' ? 'active' : 'retired';

    emp.status = newStatus;
    if (newStatus === 'retired') {
      emp.retirementInfo = {
        date: retirementDate || new Date().toISOString().slice(0, 10),
        remarks: retirementRemarks || 'Superannuated / Retired from ONGC'
      };
    } else {
      delete emp.retirementInfo;
    }

    otFdeData.lastUpdated = new Date().toISOString();
    saveOtFdeDatabase(otFdeData);

    res.json({
      success: true,
      message: newStatus === 'retired'
        ? `Employee ${emp.name} (${code}) marked as Retired / Superannuated.`
        : `Employee ${emp.name} (${code}) reactivated to Active roster.`,
      employee: emp,
      roster: otFdeData.roster
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 31e. Remove / Delete Employee from Roster
app.delete('/api/ot-fde/employee/:code', (req, res) => {
  try {
    const code = req.params.code.toUpperCase();
    if (!otFdeData.roster[code]) {
      return res.status(404).json({ success: false, error: `Employee ${code} not found in roster.` });
    }

    const removedName = otFdeData.roster[code].name;
    delete otFdeData.roster[code];
    otFdeData.lastUpdated = new Date().toISOString();
    saveOtFdeDatabase(otFdeData);

    res.json({
      success: true,
      message: `Employee ${removedName} (${code}) has been removed from the roster.`,
      roster: otFdeData.roster
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 31b. Batch Basic Pay Increment (Yearly Increment Tool)
app.post('/api/ot-fde/roster/batch-increment', (req, res) => {
  try {
    const { percentage, flatAmount, targetCodes } = req.body;
    const pct = parseFloat(percentage);

    if ((isNaN(pct) || pct <= 0) && (isNaN(parseFloat(flatAmount)) || parseFloat(flatAmount) <= 0)) {
      return res.status(400).json({ success: false, error: 'Please specify a valid percentage (e.g. 3 for 3%) or positive flat amount.' });
    }

    const codes = Array.isArray(targetCodes) && targetCodes.length > 0
      ? targetCodes
      : Object.keys(otFdeData.roster);

    const updated = [];
    for (const code of codes) {
      const emp = otFdeData.roster[code];
      if (emp) {
        const oldBasic = emp.basicPay;
        if (!isNaN(pct) && pct > 0) {
          // Standard ONGC/CPSE rule: Round basic to nearest 10
          emp.basicPay = Math.round((emp.basicPay * (1 + pct / 100)) / 10) * 10;
        } else if (flatAmount) {
          emp.basicPay = emp.basicPay + parseFloat(flatAmount);
        }
        emp.otRate = calculateOtRate(emp.basicPay, emp.da);
        updated.push({ code, name: emp.name, oldBasic, newBasic: emp.basicPay, otRate: emp.otRate });
      }
    }

    otFdeData.lastUpdated = new Date().toISOString();
    saveOtFdeDatabase(otFdeData);

    res.json({
      success: true,
      message: `Successfully applied annual increment to ${updated.length} employee(s).`,
      updatedCount: updated.length,
      roster: otFdeData.roster,
      details: updated
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 31c. Batch DA Revision (6-Month DA Revision Tool)
app.post('/api/ot-fde/roster/batch-da', (req, res) => {
  try {
    const { daAmount, daPercentage, targetCodes } = req.body;
    const codes = Array.isArray(targetCodes) && targetCodes.length > 0
      ? targetCodes
      : Object.keys(otFdeData.roster);

    const updated = [];
    if (daPercentage !== undefined && !isNaN(parseFloat(daPercentage))) {
      const pct = parseFloat(daPercentage);
      for (const code of codes) {
        const emp = otFdeData.roster[code];
        if (emp) {
          emp.da = Math.round((emp.basicPay * pct) / 100);
          emp.otRate = calculateOtRate(emp.basicPay, emp.da);
          updated.push({ code, name: emp.name, da: emp.da, otRate: emp.otRate });
        }
      }
    } else if (daAmount !== undefined && !isNaN(parseFloat(daAmount))) {
      const amount = parseFloat(daAmount);
      for (const code of codes) {
        const emp = otFdeData.roster[code];
        if (emp) {
          emp.da = amount;
          emp.otRate = calculateOtRate(emp.basicPay, emp.da);
          updated.push({ code, name: emp.name, da: emp.da, otRate: emp.otRate });
        }
      }
    } else {
      return res.status(400).json({ success: false, error: 'Please specify a valid DA amount (e.g. 21500) or DA percentage (e.g. 50%).' });
    }

    otFdeData.lastUpdated = new Date().toISOString();
    saveOtFdeDatabase(otFdeData);

    res.json({
      success: true,
      message: `Successfully updated Dearness Allowance (DA) for ${updated.length} employee(s) in 1 click.`,
      updatedCount: updated.length,
      roster: otFdeData.roster,
      details: updated
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 32. Export Statement as PDF
app.get('/api/ot-fde/export/pdf', async (req, res) => {
  try {
    const month = req.query.month || '2025-01';
    const employeeCode = (req.query.employee || req.query.empCode || 'UC').toUpperCase();
    const type = (req.query.type || 'ot').toLowerCase();

    const statements = generateMonthlyStatements(otFdeData.jobs, otFdeData.roster, month);
    const targetStatement = type === 'fde'
      ? statements.fde[employeeCode]
      : statements.ot[employeeCode];

    if (!targetStatement) {
      return res.status(404).json({ success: false, error: `Statement not found for ${employeeCode} in ${month}.` });
    }

    const pdfBuffer = await generateClaimPdf(targetStatement, type);

    const safeName = (targetStatement.employee?.name || employeeCode).replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `${type.toUpperCase()}_CLAIM_${safeName}_${month}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ success: false, error: `Failed to export PDF: ${err.message}` });
  }
});

// 33. Export Statement as Excel (.xlsx)
app.get('/api/ot-fde/export/excel', async (req, res) => {
  try {
    const month = req.query.month || '2025-01';
    const employeeCode = (req.query.employee || req.query.empCode || 'UC').toUpperCase();
    const type = (req.query.type || 'ot').toLowerCase();

    const statements = generateMonthlyStatements(otFdeData.jobs, otFdeData.roster, month);
    const targetStatement = type === 'fde'
      ? statements.fde[employeeCode]
      : statements.ot[employeeCode];

    if (!targetStatement) {
      return res.status(404).json({ success: false, error: `Statement not found for ${employeeCode} in ${month}.` });
    }

    const excelBuffer = await generateClaimExcel(targetStatement, type);

    const safeName = (targetStatement.employee?.name || employeeCode).replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `${type.toUpperCase()}_CLAIM_${safeName}_${month}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(excelBuffer);
  } catch (err) {
    res.status(500).json({ success: false, error: `Failed to export Excel: ${err.message}` });
  }
});

// Complete initialization before accepting requests.
if (!savedOperations?.activeData) await loadDefaultData();
if (!savedOperations?.wellSiteData) await loadDefaultWellSites();
if (!savedOperations?.maintenanceData) await loadDefaultMaintenanceData();
await loadDefaultOtFdeData();
// Imported legacy jobs need a rate snapshot before any pay revisions.
for (const job of otFdeData.jobs) {
  if (!Array.isArray(job.memberAllocations)) {
    job.memberAllocations = (job.crewCodes || []).filter(code => otFdeData.roster[code]).map(code => {
      const emp = otFdeData.roster[code];
      return { employeeCode: code, employeeName: emp.name, cpf: emp.cpf,
        designation: emp.designation, otRate: emp.otRate, otHours: job.otHours || 0,
        otAmount: Math.round((job.otHours || 0) * emp.otRate * 100) / 100,
        fdAmount: job.fdAmount || 0 };
    });
  }
}
saveOtFdeDatabase(otFdeData);
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ success: false, error: error.message });
});
app.listen(PORT, () => console.log(`ONGC operations portal: http://localhost:${PORT}`));
