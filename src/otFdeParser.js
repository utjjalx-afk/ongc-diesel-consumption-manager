import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { calculateOtRate, calculateDutyAndOt, FD_FIXED_RATE } from './otFdeCalculator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_STORE_PATH = path.join(__dirname, '..', 'data', 'ot_fde_store.json');

// Default initial 12 employee team roster for ONGC Reservoir Winch (SST, Jorhat)
export const DEFAULT_ROSTER = {
  PPD: {
    code: 'PPD',
    cpf: '128584',
    name: 'PRATIK PURNA DUTTA',
    designation: 'DY T (FITTING)',
    section: 'SST',
    location: 'JORHAT',
    basicPay: 38490,
    da: 19091,
    fdRate: 450,
    otRate: calculateOtRate(38490, 19091) // 553
  },
  DJB: {
    code: 'DJB',
    cpf: '128787',
    name: 'DIPJYOTI BORA',
    designation: 'EA(M)',
    section: 'SST',
    location: 'JORHAT',
    basicPay: 43250,
    da: 21452,
    fdRate: 450,
    otRate: calculateOtRate(43250, 21452) // 622
  },
  SD: {
    code: 'SD',
    cpf: '128864',
    name: 'SUBHASISH DAS',
    designation: 'MVD(WO)',
    section: 'SST',
    location: 'JORHAT',
    basicPay: 38490,
    da: 19091,
    fdRate: 450,
    otRate: calculateOtRate(38490, 19091) // 553
  },
  DB: {
    code: 'DB',
    cpf: '128798',
    name: 'DEBAJIT BORA',
    designation: 'DY. T (FITTING)',
    section: 'SST',
    location: 'JORHAT',
    basicPay: 38490,
    da: 19091,
    fdRate: 450,
    otRate: calculateOtRate(38490, 19091) // 553
  },
  HR: {
    code: 'HR',
    cpf: '132598',
    name: 'HRIDOY RAY',
    designation: 'Dy. T (FITTING)',
    section: 'SST',
    location: 'JORHAT',
    basicPay: 37370,
    da: 18536,
    fdRate: 450,
    otRate: calculateOtRate(37370, 18536) // 537
  },
  YA: {
    code: 'YA',
    cpf: '137508',
    name: 'YUSUF ALI',
    designation: 'JR KHALASHI',
    section: 'SST',
    location: 'JORHAT',
    basicPay: 29560,
    da: 14662,
    fdRate: 450,
    otRate: calculateOtRate(29560, 14662) // 425
  },
  RRK: {
    code: 'RRK',
    cpf: '137500',
    name: 'RAJEN RAJKONWAR',
    designation: 'JR KHALASHI',
    section: 'SST',
    location: 'JORHAT',
    basicPay: 29560,
    da: 14662,
    fdRate: 450,
    otRate: calculateOtRate(29560, 14662) // 425
  },
  SR: {
    code: 'SR',
    cpf: '137510',
    name: 'SAHIDUR ROHMAN',
    designation: 'JR KHALASHI',
    section: 'SST',
    location: 'JORHAT',
    basicPay: 29560,
    da: 14662,
    fdRate: 450,
    otRate: calculateOtRate(29560, 14662) // 425
  },
  MP: {
    code: 'MP',
    cpf: '128734',
    name: 'MANABJYOTI PEGU',
    designation: 'JMVD(W.O.)',
    section: 'SST',
    location: 'JORHAT',
    basicPay: 36030,
    da: 17871,
    fdRate: 450,
    otRate: calculateOtRate(36030, 17871) // 518
  },
  AB: {
    code: 'AB',
    cpf: '129190',
    name: 'ABHIJIT BORAH',
    designation: 'EA(P)',
    section: 'SST',
    location: 'JORHAT',
    basicPay: 41990,
    da: 20827,
    fdRate: 450,
    otRate: calculateOtRate(41990, 20827) // 603
  },
  RD: {
    code: 'RD',
    cpf: '138139',
    name: 'RAJESH DAS',
    designation: 'JT(FITTING)',
    section: 'SST',
    location: 'JORHAT',
    basicPay: 30860,
    da: 15307,
    fdRate: 450,
    otRate: calculateOtRate(30860, 15307) // 443
  },
  UC: {
    code: 'UC',
    cpf: '140751',
    name: 'UTJJAL CHETIA',
    designation: 'JMVD(W.O.)',
    section: 'SST',
    location: 'JORHAT',
    basicPay: 28230,
    da: 14002,
    fdRate: 450,
    otRate: calculateOtRate(28230, 14002) // 406
  }
};

/**
 * Format Date or Time from Excel cell
 */
function parseCellTime(val, fallback = '08:30') {
  if (!val) return fallback;
  if (val instanceof Date) {
    const h = String(val.getUTCHours()).padStart(2, '0');
    const m = String(val.getUTCMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed.includes(':')) {
      const parts = trimmed.split(':');
      return `${String(parts[0]).padStart(2, '0')}:${String(parts[1] || '00').padStart(2, '0')}`;
    }
  }
  return fallback;
}

function parseCellDate(val) {
  if (!val) return null;
  if (val instanceof Date) {
    return val.toISOString().split('T')[0];
  }
  const str = String(val).trim();
  // Handle DD.MM.YYYY
  const parts = str.split('.');
  if (parts.length === 3 && parts[2].length === 4) {
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  return str;
}

/**
 * Parse FDE workbook (FDE  JANUARY 2025.xlsx)
 */
export async function parseFdeWorkbook(filePath) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);

  const jobsMap = new Map(); // key: date + location + depTime + arrTime -> job
  const roster = { ...DEFAULT_ROSTER };

  for (const ws of wb.worksheets) {
    const code = ws.name.trim();
    // Update employee profile if found
    const cpf = ws.getCell('B7').value;
    const name = ws.getCell('E7').value;
    const desig = ws.getCell('B8').value;
    const basic = ws.getCell('E11').value;
    const da = ws.getCell('H11').value;

    if (roster[code]) {
      if (cpf) roster[code].cpf = String(cpf).trim();
      if (name) roster[code].name = String(name).trim();
      if (desig) roster[code].designation = String(desig).trim();
      if (basic) roster[code].basicPay = parseFloat(basic) || roster[code].basicPay;
      if (da) roster[code].da = parseFloat(da) || roster[code].da;
      roster[code].otRate = calculateOtRate(roster[code].basicPay, roster[code].da);
    }

    // Read entries from row 17 onwards
    for (let r = 17; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const rawDate = row.getCell(1).value;
      if (!rawDate || String(rawDate).toLowerCase().includes('total')) break;

      const dateStr = parseCellDate(rawDate);
      if (!dateStr) continue;

      const depTime = parseCellTime(row.getCell(2).value, '08:30');
      const arrTime = parseCellTime(row.getCell(3).value, '17:30');
      const location = String(row.getCell(5).value || 'BORHOLLA').trim();
      const remarks = String(row.getCell(6).value || '').trim();

      const key = `${dateStr}_${location}_${depTime}_${arrTime}`;
      if (!jobsMap.has(key)) {
        const calcs = calculateDutyAndOt(depTime, arrTime);
        jobsMap.set(key, {
          id: `JOB-${dateStr.replace(/-/g, '')}-${jobsMap.size + 1}`,
          date: dateStr,
          depTime,
          arrTime,
          location,
          vehicle: 'AS-04AC-7845', // Standard fleet winch
          remarks,
          dutyHours: calcs.dutyHours,
          fdShifts: calcs.fdShifts,
          fdAmount: calcs.fdAmount,
          otHours: calcs.otHours,
          isWithinDutyHours: calcs.isWithinDutyHours,
          crewCodes: [code]
        });
      } else {
        const existing = jobsMap.get(key);
        if (!existing.crewCodes.includes(code)) {
          existing.crewCodes.push(code);
        }
      }
    }
  }

  return {
    roster,
    jobs: Array.from(jobsMap.values())
  };
}

/**
 * Parse Overtime Claim workbook (OT_APRIL_2024_Macros.xlsm)
 */
export async function parseOtWorkbook(filePath, existingJobs = [], existingRoster = DEFAULT_ROSTER) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);

  const jobsMap = new Map();
  // seed existing
  for (const j of existingJobs) {
    const key = `${j.date}_${j.location}_${j.depTime}_${j.arrTime}`;
    jobsMap.set(key, j);
  }

  const roster = { ...existingRoster };

  for (const ws of wb.worksheets) {
    const code = ws.name.trim();
    if (!roster[code]) continue;

    for (let r = 17; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const rawDate = row.getCell(1).value;
      if (!rawDate || String(rawDate).toLowerCase().includes('total')) break;

      const dateStr = parseCellDate(rawDate);
      if (!dateStr) continue;

      const depTime = parseCellTime(row.getCell(2).value, '08:30');
      const arrTime = parseCellTime(row.getCell(3).value, '18:00');
      const otClaimVal = parseFloat(row.getCell(5).value) || 0;
      const remarks = String(row.getCell(6).value || '').trim();
      
      // Determine location from remarks or default
      let location = 'BORHOLLA';
      const uRem = remarks.toUpperCase();
      if (uRem.includes('KH') || uRem.includes('KHORAGHAT')) location = 'KHORAGHAT';
      else if (uRem.includes('KS') || uRem.includes('KASOMARI')) location = 'KASOMARI';
      else if (uRem.includes('NR') || uRem.includes('NAMBAR')) location = 'NAMBAR';
      else if (uRem.includes('MRDB')) location = 'MRDB';

      const key = `${dateStr}_${location}_${depTime}_${arrTime}`;
      if (!jobsMap.has(key)) {
        const calcs = calculateDutyAndOt(depTime, arrTime, { manualOtHours: otClaimVal });
        jobsMap.set(key, {
          id: `JOB-${dateStr.replace(/-/g, '')}-${jobsMap.size + 1}`,
          date: dateStr,
          depTime,
          arrTime,
          location,
          vehicle: 'AS-04AC-7845',
          remarks,
          dutyHours: calcs.dutyHours,
          fdShifts: calcs.fdShifts,
          fdAmount: calcs.fdAmount,
          otHours: otClaimVal || calcs.otHours,
          isWithinDutyHours: calcs.isWithinDutyHours,
          crewCodes: [code]
        });
      } else {
        const existing = jobsMap.get(key);
        if (!existing.crewCodes.includes(code)) {
          existing.crewCodes.push(code);
        }
      }
    }
  }

  return {
    roster,
    jobs: Array.from(jobsMap.values())
  };
}

/**
 * Initialize and load unified OT & FDE Database
 */
export async function initOtFdeDatabase() {
  // If persistent store already exists, load it
  if (fs.existsSync(DATA_STORE_PATH)) {
    try {
      const raw = fs.readFileSync(DATA_STORE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed.roster && parsed.jobs && parsed.jobs.length > 0) {
        console.log(`Loaded ${parsed.jobs.length} OT/FDE jobs from persistent store.`);
        return parsed;
      }
    } catch (e) {
      console.warn('Failed to read ot_fde_store.json, parsing fresh:', e);
    }
  }

  // Parse fresh from workbooks
  const fdePath = path.join(__dirname, '..', 'data', 'FDE  JANUARY 2025.xlsx');
  const otPath = path.join(__dirname, '..', 'data', 'OT_APRIL_2024_Macros.xlsm');

  let database = {
    roster: { ...DEFAULT_ROSTER },
    jobs: []
  };

  if (fs.existsSync(fdePath)) {
    console.log('Parsing FDE January 2025 workbook...');
    const fdeRes = await parseFdeWorkbook(fdePath);
    database.roster = fdeRes.roster;
    database.jobs = fdeRes.jobs;
  }

  if (fs.existsSync(otPath)) {
    console.log('Parsing OT April 2024 workbook...');
    const otRes = await parseOtWorkbook(otPath, database.jobs, database.roster);
    database.roster = otRes.roster;
    database.jobs = otRes.jobs;
  }

  // Sort jobs descending by date
  database.jobs.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  // Save to persistent file
  saveOtFdeDatabase(database);
  return database;
}

/**
 * Persist database to disk
 */
export function saveOtFdeDatabase(database) {
  try {
    fs.writeFileSync(DATA_STORE_PATH, JSON.stringify(database, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving ot_fde_store.json:', e);
  }
}
