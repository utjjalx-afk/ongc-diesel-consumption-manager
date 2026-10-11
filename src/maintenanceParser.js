import ExcelJS from 'exceljs';
import fs from 'fs';

// Helper: Normalize vehicle registration strings
export function normalizeVehicleId(name) {
  if (!name) return '';
  const clean = String(name).trim().toUpperCase().replace(/\s+/g, '');
  if (clean.includes('7845')) return 'AS-04AC-7845';
  if (clean.includes('3120')) return 'AS-04AC-3120';
  if (clean.includes('2483')) return 'AS-03-B-2483';
  if (clean.includes('8327')) return 'AS-03-AJ-8327';
  return String(name).trim();
}

// Helper: Format Date to DD-MM-YYYY
export function formatDateDisplay(val) {
  if (!val) return 'N/A';
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return 'N/A';
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${d}-${m}-${y}`;
  }
  const str = String(val).trim();
  if (str.match(/^\d{4}-\d{2}-\d{2}/)) {
    const parts = str.substring(0, 10).split('-');
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return str || 'N/A';
}

// Helper: Format Date to ISO YYYY-MM-DD
export function toIsoDate(val) {
  if (!val) return null;
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    return val.toISOString().substring(0, 10);
  }
  const str = String(val).trim();
  if (str.match(/^\d{4}-\d{2}-\d{2}/)) {
    return str.substring(0, 10);
  }
  const m = str.match(/^(\d{2})[-/](\d{2})[-/](\d{4})/);
  if (m) {
    return `${m[3]}-${m[2]}-${m[1]}`;
  }
  return null;
}

// Helper: Calculate validity status for statutory documents
export function calculateDocStatus(isoDate) {
  if (!isoDate) return { status: 'na', label: 'Not Available', daysLeft: null, isCritical: false, isExpiring10d: false };
  const target = new Date(isoDate + 'T00:00:00Z');
  if (isNaN(target.getTime())) return { status: 'na', label: 'Not Available', daysLeft: null, isCritical: false, isExpiring10d: false };

  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) {
    return { status: 'expired', label: `Expired (${Math.abs(daysLeft)}d ago)`, daysLeft, isCritical: true, isExpiring10d: false };
  } else if (daysLeft <= 10) {
    return { status: 'expiring_soon', label: daysLeft === 0 ? 'Expiring Today' : `Due in ${daysLeft} days`, daysLeft, isCritical: true, isExpiring10d: true };
  } else if (daysLeft <= 60) {
    return { status: 'expiring_soon', label: `Due in ${daysLeft} days`, daysLeft, isCritical: false, isExpiring10d: false };
  } else {
    return { status: 'valid', label: `Valid (${daysLeft}d left)`, daysLeft, isCritical: false, isExpiring10d: false };
  }
}

// Helper: Detect maintenance category from work description
export function detectMaintenanceCategory(desc) {
  if (!desc) return 'General Service';
  const text = desc.toUpperCase();
  if (text.includes('OIL') || text.includes('COOLANT') || text.includes('FILTER') || text.includes('GREASE') || text.includes('HYDROLIC') || text.includes('HYDRAULIC')) {
    return 'Fluids & Lubrication';
  }
  if (text.includes('BRAKE') || text.includes('SERVO')) {
    return 'Brake System';
  }
  if (text.includes('STARTER') || text.includes('MOTOR') || text.includes('WIRE') || text.includes('WIRING') || text.includes('BATTERY')) {
    return 'Electrical System';
  }
  if (text.includes('ENGINE LIGHT') || text.includes('CHECK ENGINE') || text.includes('DIAGNOSTIC')) {
    return 'Engine Diagnostics';
  }
  if (text.includes('TIRE') || text.includes('TYRE') || text.includes('WHEEL') || text.includes('HUB')) {
    return 'Wheel & Hub';
  }
  return 'Mechanical & Winch';
}

/**
 * Main Parser: Reads the Excel file and extracts statutory document records and maintenance entries
 */
export async function parseVehicleDocumentsAndMaintenance(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const vehicleDocumentMap = {
    'AS-04AC-7845': { vehicleId: 'AS-04AC-7845', vehicleName: 'AS-04AC-7845', vehicleType: 'Reservoir Winch', tax: null, pollution: null, insurance: null, permit: null },
    'AS-04AC-3120': { vehicleId: 'AS-04AC-3120', vehicleName: 'AS-04AC-3120', vehicleType: 'Reservoir Winch', tax: null, pollution: null, insurance: null, permit: null },
    'AS-03-B-2483': { vehicleId: 'AS-03-B-2483', vehicleName: 'AS-03-B-2483', vehicleType: 'Reservoir Winch', tax: null, pollution: null, insurance: null, permit: null },
    'AS-03-AJ-8327': { vehicleId: 'AS-03-AJ-8327', vehicleName: 'AS-03-AJ-8327', vehicleType: 'Reservoir Winch', tax: null, pollution: null, insurance: null, permit: null }
  };

  // 1. Parse Consolidated 'ALL VEHICLE ' Sheet
  let wsAll = workbook.getWorksheet('ALL VEHICLE ') || workbook.getWorksheet('ALL VEHICLE');
  if (wsAll) {
    wsAll.eachRow((row, rNum) => {
      if (rNum < 6) return;
      const values = row.values;
      if (!values || values.length < 2) return;

      const rawVeh = values[1];
      if (!rawVeh || typeof rawVeh !== 'string' || rawVeh.toUpperCase().includes('VEHICLE')) return;

      const vId = normalizeVehicleId(rawVeh);
      if (vehicleDocumentMap[vId]) {
        const rawTax = values[2];
        const rawPollution = values[3];
        const rawInsurance = values[4];
        const rawPermit = values[5];

        vehicleDocumentMap[vId].tax = toIsoDate(rawTax);
        vehicleDocumentMap[vId].pollution = toIsoDate(rawPollution);
        vehicleDocumentMap[vId].insurance = toIsoDate(rawInsurance);
        vehicleDocumentMap[vId].permit = toIsoDate(rawPermit);
      }
    });
  }

  // 2. Parse individual vehicle sheets if any dates were missing
  const sheetNames = workbook.worksheets.map(w => w.name);
  sheetNames.forEach(name => {
    const vId = normalizeVehicleId(name);
    if (vehicleDocumentMap[vId] && name !== 'ALL VEHICLE ' && name !== 'MAINTAINCE WINCH') {
      const ws = workbook.getWorksheet(name);
      if (ws) {
        let taxIdx = -1, polIdx = -1, insIdx = -1, perIdx = -1;
        ws.eachRow((row, rNum) => {
          const vals = row.values;
          if (!vals) return;
          // Look for header row
          for (let c = 1; c < vals.length; c++) {
            const h = String(vals[c] || '').toUpperCase().trim();
            if (h.includes('TAX')) taxIdx = c;
            if (h.includes('POLLUTION')) polIdx = c;
            if (h.includes('INSURANCE')) insIdx = c;
            if (h.includes('PERMIT')) perIdx = c;
          }

          // If we found headers and are on data rows
          if (taxIdx !== -1 && rNum > 4) {
            if (vals[taxIdx] && !vehicleDocumentMap[vId].tax) vehicleDocumentMap[vId].tax = toIsoDate(vals[taxIdx]);
            if (vals[polIdx] && !vehicleDocumentMap[vId].pollution) vehicleDocumentMap[vId].pollution = toIsoDate(vals[polIdx]);
            if (vals[insIdx] && !vehicleDocumentMap[vId].insurance) vehicleDocumentMap[vId].insurance = toIsoDate(vals[insIdx]);
            if (vals[perIdx] && !vehicleDocumentMap[vId].permit) vehicleDocumentMap[vId].permit = toIsoDate(vals[perIdx]);
          }
        });
      }
    }
  });

  // Calculate statuses for each document
  const vehicles = Object.values(vehicleDocumentMap).map(v => {
    return {
      ...v,
      taxFormatted: formatDateDisplay(v.tax),
      taxStatus: calculateDocStatus(v.tax),
      pollutionFormatted: formatDateDisplay(v.pollution),
      pollutionStatus: calculateDocStatus(v.pollution),
      insuranceFormatted: formatDateDisplay(v.insurance),
      insuranceStatus: calculateDocStatus(v.insurance),
      permitFormatted: formatDateDisplay(v.permit),
      permitStatus: calculateDocStatus(v.permit)
    };
  });

  // 3. Parse 'MAINTAINCE WINCH' Sheet
  const maintenanceRecords = [];
  const wsM = workbook.getWorksheet('MAINTAINCE WINCH');
  if (wsM) {
    let entryCounter = 1;
    wsM.eachRow((row, rNum) => {
      if (rNum < 9) return;
      const vals = row.values;
      if (!vals) return;

      let vehicleVal = null;
      let dateVal = null;
      let descVal = null;

      // Extract non-null values
      const nonNulls = [];
      for (let i = 1; i < vals.length; i++) {
        if (vals[i] !== null && vals[i] !== undefined && vals[i] !== '') {
          nonNulls.push(vals[i]);
        }
      }

      if (nonNulls.length === 0) return;

      // Find vehicle in nonNulls
      for (const item of nonNulls) {
        const s = String(item).toUpperCase();
        if (s.includes('AS-') || s.includes('AS0') || s.includes('AS 0')) {
          vehicleVal = item;
          break;
        }
      }

      // Find date
      for (const item of nonNulls) {
        if (item instanceof Date || (typeof item === 'string' && item.match(/^\d{4}-\d{2}-\d{2}/))) {
          dateVal = item;
          break;
        }
      }

      // Find description (longest string that isn't the vehicle)
      for (const item of nonNulls) {
        if (typeof item === 'string' && item !== vehicleVal && !item.match(/^\d{4}-\d{2}-\d{2}/) && item.length > 3) {
          descVal = item;
        }
      }

      if (vehicleVal && (dateVal || descVal)) {
        const vId = normalizeVehicleId(vehicleVal);
        const isoDate = toIsoDate(dateVal);
        const descClean = (descVal || 'Routine Inspection & Service').replace(/\s+/g, ' ').trim();
        const cat = detectMaintenanceCategory(descClean);

        maintenanceRecords.push({
          id: `maint_${Date.now()}_${entryCounter++}`,
          vehicleId: vId,
          vehicleName: vId,
          date: isoDate || new Date().toISOString().substring(0, 10),
          dateFormatted: formatDateDisplay(isoDate),
          description: descClean,
          category: cat
        });
      }
    });
  }

  // Sort maintenance records descending by date
  maintenanceRecords.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Compute summary stats
  const totalVehicles = vehicles.length;
  let totalValidDocs = 0;
  let totalExpiringSoon = 0;
  let totalExpired = 0;

  vehicles.forEach(v => {
    [v.taxStatus, v.pollutionStatus, v.insuranceStatus, v.permitStatus].forEach(st => {
      if (st.status === 'valid') totalValidDocs++;
      if (st.status === 'expiring_soon') totalExpiringSoon++;
      if (st.status === 'expired') totalExpired++;
    });
  });

  return {
    vehicles,
    maintenanceRecords,
    summary: {
      totalVehicles,
      totalMaintenanceServices: maintenanceRecords.length,
      totalValidDocs,
      totalExpiringSoon,
      totalExpired
    }
  };
}
