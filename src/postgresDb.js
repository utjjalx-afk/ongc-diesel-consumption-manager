import pkg from 'pg';
const { Pool } = pkg;

// Default PostgreSQL configuration from environment
function getPgConfig() {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (connectionString) {
    return { connectionString, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false };
  }
  return {
    host: process.env.PGHOST || 'localhost',
    port: parseInt(process.env.PGPORT || '5432', 10),
    database: process.env.PGDATABASE || 'ongc_operations',
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || '',
    connectionTimeoutMillis: 3000,
    idleTimeoutMillis: 10000,
    max: 10
  };
}

let pgPool = null;
let lastConnectionAttempt = 0;
let connectionStatus = {
  connected: false,
  error: null,
  testedAt: null,
  config: null
};

export async function initPostgresPool(customConfig = null) {
  try {
    if (pgPool) {
      await pgPool.end().catch(() => {});
      pgPool = null;
    }
    const config = customConfig || getPgConfig();
    pgPool = new Pool(config);
    
    // Quick connection test query
    const client = await pgPool.connect();
    try {
      const res = await client.query('SELECT NOW() as current_time, version() as version');
      connectionStatus = {
        connected: true,
        error: null,
        testedAt: new Date().toISOString(),
        version: res.rows[0]?.version || 'PostgreSQL',
        serverTime: res.rows[0]?.current_time
      };
      await initSchema(client);
    } finally {
      client.release();
    }
    return connectionStatus;
  } catch (err) {
    connectionStatus = {
      connected: false,
      error: err.message,
      testedAt: new Date().toISOString(),
      version: null
    };
    return connectionStatus;
  }
}

export async function testPgConnection(config) {
  let tempPool = null;
  try {
    tempPool = new Pool({
      ...config,
      connectionTimeoutMillis: 4000
    });
    const client = await tempPool.connect();
    try {
      const res = await client.query('SELECT NOW() as now, version() as ver');
      return {
        success: true,
        version: res.rows[0]?.ver,
        timestamp: res.rows[0]?.now
      };
    } finally {
      client.release();
    }
  } catch (err) {
    return {
      success: false,
      error: err.message
    };
  } finally {
    if (tempPool) {
      await tempPool.end().catch(() => {});
    }
  }
}

export function getPostgresStatus() {
  const config = getPgConfig();
  const maskedConfig = {
    host: config.host || (config.connectionString ? config.connectionString.split('@')[1]?.split('/')[0] : 'localhost'),
    port: config.port || 5432,
    database: config.database || (config.connectionString ? config.connectionString.split('/').pop()?.split('?')[0] : 'ongc_operations'),
    user: config.user || (config.connectionString ? config.connectionString.split('://')[1]?.split(':')[0] : 'postgres'),
    hasConnectionString: Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL)
  };

  return {
    isPostgresConnected: connectionStatus.connected,
    engine: connectionStatus.connected ? 'PostgreSQL Relational Engine' : 'Enterprise High-Availability JSON Store',
    fallbackActive: !connectionStatus.connected,
    connectionDetails: maskedConfig,
    lastTested: connectionStatus.testedAt,
    error: connectionStatus.error,
    version: connectionStatus.version
  };
}

export async function initSchema(client) {
  if (!client) return;
  const ddl = `
    CREATE TABLE IF NOT EXISTS ongc_users (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(64) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      role VARCHAR(255),
      cpf VARCHAR(64),
      dob DATE,
      saved_password TEXT,
      department VARCHAR(128),
      location VARCHAR(128),
      is_admin BOOLEAN DEFAULT FALSE,
      status VARCHAR(32) DEFAULT 'active',
      password_hash TEXT,
      registered_at TIMESTAMPTZ DEFAULT NOW(),
      last_login TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS ongc_audit_log (
      id SERIAL PRIMARY KEY,
      audit_id VARCHAR(64) UNIQUE NOT NULL,
      timestamp TIMESTAMPTZ NOT NULL,
      action VARCHAR(128) NOT NULL,
      user_id VARCHAR(64),
      details JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS ongc_ot_fde_jobs (
      id SERIAL PRIMARY KEY,
      job_id VARCHAR(64) UNIQUE NOT NULL,
      date DATE NOT NULL,
      month VARCHAR(16) NOT NULL,
      location VARCHAR(255),
      work_type VARCHAR(255),
      start_time VARCHAR(16),
      end_time VARCHAR(16),
      duty_hours NUMERIC(6, 2),
      ot_hours NUMERIC(6, 2),
      fd_shifts NUMERIC(6, 3),
      ot_amount NUMERIC(10, 2),
      fd_amount NUMERIC(10, 2),
      total_claim NUMERIC(10, 2),
      crew_members JSONB,
      raw_data JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS ongc_roster (
      id SERIAL PRIMARY KEY,
      employee_code VARCHAR(32) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      designation VARCHAR(255),
      cpf VARCHAR(64),
      ot_rate NUMERIC(10, 2),
      basic_pay NUMERIC(10, 2),
      da_rate NUMERIC(10, 2),
      status VARCHAR(32) DEFAULT 'active',
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS ongc_backups (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) UNIQUE NOT NULL,
      backup_type VARCHAR(32) NOT NULL,
      size_bytes BIGINT,
      records_count JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;
  await client.query(ddl);
}

// Generates an enterprise-grade standard PostgreSQL .sql DDL & DML script
export function generateSqlDump(data) {
  const timestamp = new Date().toISOString();
  let sql = `-- ==========================================================================\n`;
  sql += `-- ONGC Assam Asset Operations Portal - PostgreSQL Database Dump\n`;
  sql += `-- Generated: ${timestamp}\n`;
  sql += `-- Target Engine: PostgreSQL 12+ / 14+ / 16+\n`;
  sql += `-- ==========================================================================\n\n`;
  sql += `BEGIN;\n\n`;

  sql += `-- 1. Schema DDL Definition\n`;
  sql += `CREATE TABLE IF NOT EXISTS ongc_users (\n`;
  sql += `    id SERIAL PRIMARY KEY,\n`;
  sql += `    user_id VARCHAR(64) UNIQUE NOT NULL,\n`;
  sql += `    name VARCHAR(255) NOT NULL,\n`;
  sql += `    role VARCHAR(255),\n`;
  sql += `    cpf VARCHAR(64),\n`;
  sql += `    dob DATE,\n`;
  sql += `    saved_password TEXT,\n`;
  sql += `    department VARCHAR(128),\n`;
  sql += `    location VARCHAR(128),\n`;
  sql += `    is_admin BOOLEAN DEFAULT FALSE,\n`;
  sql += `    status VARCHAR(32) DEFAULT 'active',\n`;
  sql += `    password_hash TEXT,\n`;
  sql += `    registered_at TIMESTAMPTZ DEFAULT NOW(),\n`;
  sql += `    last_login TIMESTAMPTZ,\n`;
  sql += `    created_at TIMESTAMPTZ DEFAULT NOW()\n`;
  sql += `);\n\n`;

  sql += `CREATE TABLE IF NOT EXISTS ongc_audit_log (\n`;
  sql += `    id SERIAL PRIMARY KEY,\n`;
  sql += `    audit_id VARCHAR(64) UNIQUE NOT NULL,\n`;
  sql += `    timestamp TIMESTAMPTZ NOT NULL,\n`;
  sql += `    action VARCHAR(128) NOT NULL,\n`;
  sql += `    user_id VARCHAR(64),\n`;
  sql += `    details JSONB,\n`;
  sql += `    created_at TIMESTAMPTZ DEFAULT NOW()\n`;
  sql += `);\n\n`;

  sql += `CREATE TABLE IF NOT EXISTS ongc_roster (\n`;
  sql += `    id SERIAL PRIMARY KEY,\n`;
  sql += `    employee_code VARCHAR(32) UNIQUE NOT NULL,\n`;
  sql += `    name VARCHAR(255) NOT NULL,\n`;
  sql += `    designation VARCHAR(255),\n`;
  sql += `    cpf VARCHAR(64),\n`;
  sql += `    ot_rate NUMERIC(10, 2),\n`;
  sql += `    basic_pay NUMERIC(10, 2),\n`;
  sql += `    da_rate NUMERIC(10, 2),\n`;
  sql += `    status VARCHAR(32) DEFAULT 'active',\n`;
  sql += `    updated_at TIMESTAMPTZ DEFAULT NOW()\n`;
  sql += `);\n\n`;

  sql += `CREATE TABLE IF NOT EXISTS ongc_ot_fde_jobs (\n`;
  sql += `    id SERIAL PRIMARY KEY,\n`;
  sql += `    job_id VARCHAR(64) UNIQUE NOT NULL,\n`;
  sql += `    date DATE NOT NULL,\n`;
  sql += `    month VARCHAR(16) NOT NULL,\n`;
  sql += `    location VARCHAR(255),\n`;
  sql += `    work_type VARCHAR(255),\n`;
  sql += `    start_time VARCHAR(16),\n`;
  sql += `    end_time VARCHAR(16),\n`;
  sql += `    duty_hours NUMERIC(6, 2),\n`;
  sql += `    ot_hours NUMERIC(6, 2),\n`;
  sql += `    fd_shifts NUMERIC(6, 3),\n`;
  sql += `    ot_amount NUMERIC(10, 2),\n`;
  sql += `    fd_amount NUMERIC(10, 2),\n`;
  sql += `    total_claim NUMERIC(10, 2),\n`;
  sql += `    crew_members JSONB,\n`;
  sql += `    raw_data JSONB,\n`;
  sql += `    created_at TIMESTAMPTZ DEFAULT NOW()\n`;
  sql += `);\n\n`;

  // Escape helper for SQL single quotes
  const esc = (val) => {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
    if (typeof val === 'number') return isNaN(val) ? '0' : String(val);
    return `'${String(val).replace(/'/g, "''")}'`;
  };

  // 2. Insert Users
  if (data.users && Array.isArray(data.users.users)) {
    sql += `-- 2. Data Insertion: Users (${data.users.users.length} records)\n`;
    for (const u of data.users.users) {
      sql += `INSERT INTO ongc_users (user_id, name, role, cpf, dob, saved_password, department, location, is_admin, status, password_hash, registered_at, last_login)\n`;
      sql += `VALUES (${esc(u.userId)}, ${esc(u.name)}, ${esc(u.role)}, ${esc(u.cpf)}, ${esc(u.dob)}, ${esc(u.savedPassword)}, ${esc(u.department)}, ${esc(u.location)}, ${esc(u.isAdmin)}, ${esc(u.status || 'active')}, ${esc(u.passwordHash)}, ${esc(u.registeredAt)}, ${esc(u.lastLogin)})\n`;
      sql += `ON CONFLICT (user_id) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role, saved_password = EXCLUDED.saved_password, dob = EXCLUDED.dob, password_hash = EXCLUDED.password_hash;\n\n`;
    }
  }

  // 3. Insert Audit Log
  if (data.users && Array.isArray(data.users.auditLog)) {
    sql += `-- 3. Data Insertion: Audit Log (${data.users.auditLog.length} records)\n`;
    for (const a of data.users.auditLog) {
      sql += `INSERT INTO ongc_audit_log (audit_id, timestamp, action, user_id, details)\n`;
      sql += `VALUES (${esc(a.id)}, ${esc(a.timestamp)}, ${esc(a.action)}, ${esc(a.userId)}, ${esc(JSON.stringify(a.details || {}))}::jsonb)\n`;
      sql += `ON CONFLICT (audit_id) DO NOTHING;\n\n`;
    }
  }

  // 4. Insert Roster
  if (data.otFde && data.otFde.roster) {
    const rosterList = Object.values(data.otFde.roster);
    sql += `-- 4. Data Insertion: Roster & Pay Scales (${rosterList.length} employees)\n`;
    for (const emp of rosterList) {
      sql += `INSERT INTO ongc_roster (employee_code, name, designation, cpf, ot_rate, basic_pay, da_rate, status)\n`;
      sql += `VALUES (${esc(emp.code)}, ${esc(emp.name)}, ${esc(emp.designation || emp.role)}, ${esc(emp.cpf)}, ${esc(emp.otRate)}, ${esc(emp.basicPay)}, ${esc(emp.da || emp.daRate)}, ${esc(emp.status || 'active')})\n`;
      sql += `ON CONFLICT (employee_code) DO UPDATE SET ot_rate = EXCLUDED.ot_rate, basic_pay = EXCLUDED.basic_pay, da_rate = EXCLUDED.da_rate;\n\n`;
    }
  }

  // 5. Insert Jobs
  if (data.otFde && Array.isArray(data.otFde.jobs)) {
    sql += `-- 5. Data Insertion: OT / FDE Field Jobs (${data.otFde.jobs.length} jobs)\n`;
    for (const j of data.otFde.jobs) {
      const jobId = j.id || j.jobId || `JOB_${j.date}_${j.location || 'SITE'}`;
      sql += `INSERT INTO ongc_ot_fde_jobs (job_id, date, month, location, work_type, start_time, end_time, duty_hours, ot_hours, fd_shifts, ot_amount, fd_amount, total_claim, crew_members, raw_data)\n`;
      sql += `VALUES (${esc(jobId)}, ${esc(j.date)}, ${esc(j.month || String(j.date).substring(0, 7))}, ${esc(j.location || j.wellSite)}, ${esc(j.workType || j.natureOfWork)}, ${esc(j.startTime)}, ${esc(j.endTime)}, ${esc(j.dutyHours)}, ${esc(j.otHours)}, ${esc(j.fdShifts)}, ${esc(j.otAmount)}, ${esc(j.fdAmount)}, ${esc(j.totalClaim || ((j.otAmount || 0) + (j.fdAmount || 0)))}, ${esc(JSON.stringify(j.crew || j.crewMembers || []))}::jsonb, ${esc(JSON.stringify(j))}::jsonb)\n`;
      sql += `ON CONFLICT (job_id) DO UPDATE SET total_claim = EXCLUDED.total_claim, raw_data = EXCLUDED.raw_data;\n\n`;
    }
  }

  sql += `COMMIT;\n`;
  sql += `-- End of ONGC PostgreSQL Database Dump\n`;
  return sql;
}
