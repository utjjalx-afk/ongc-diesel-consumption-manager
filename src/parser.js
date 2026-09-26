import ExcelJS from 'exceljs';
import { calculateBatchMetrics } from './calculator.js';

function formatCellValue(val) {
  if (val === null || val === undefined) return '';
  if (val instanceof Date) {
    const yyyy = val.getFullYear();
    const mm = String(val.getMonth() + 1).padStart(2, '0');
    const dd = String(val.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  if (typeof val === 'object') {
    if (val.text) return String(val.text).trim();
    if (val.result !== undefined) return String(val.result).trim();
    if (val.richText) return val.richText.map(t => t.text).join('').trim();
  }
  return String(val).trim();
}

function parseNumeric(val, defaultVal = 0) {
  if (val === null || val === undefined || val === '') return defaultVal;
  if (typeof val === 'object' && val.result !== undefined) {
    val = val.result;
  }
  const n = parseFloat(val);
  return isNaN(n) ? defaultVal : n;
}

function parseDateStr(val) {
  if (!val) return '';
  if (val instanceof Date) {
    const yyyy = val.getFullYear();
    const mm = String(val.getMonth() + 1).padStart(2, '0');
    const dd = String(val.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  const s = String(val).trim();
  // Match DD/MM/YYYY or DD.MM.YYYY
  const m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
  if (m) {
    let year = parseInt(m[3], 10);
    if (year < 100) year += 2000;
    const month = String(parseInt(m[2], 10)).padStart(2, '0');
    const day = String(parseInt(m[1], 10)).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return s;
}

export async function parseWorkbook(filePathOrBuffer) {
  const workbook = new ExcelJS.Workbook();
  if (typeof filePathOrBuffer === 'string') {
    await workbook.xlsx.readFile(filePathOrBuffer);
  } else {
    await workbook.xlsx.load(filePathOrBuffer);
  }

  const vehicles = [];
  const dieselIssuedRecords = [];

  // 1. Check for "Diesel Issued Date" sheet
  const issuedSheet = workbook.getWorksheet('Diesel Issued Date');
  if (issuedSheet) {
    issuedSheet.eachRow((row, rowNumber) => {
      if (rowNumber <= 3) return; // headers
      const vals = [];
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        vals[colNumber] = cell.value;
      });
      const indentDate = parseDateStr(vals[1]);
      const qty = parseNumeric(vals[2]);
      const winch = formatCellValue(vals[3]);
      const cpf = formatCellValue(vals[4]);

      if (indentDate || qty > 0 || winch) {
        dieselIssuedRecords.push({
          id: `issued-${rowNumber}`,
          indentDate,
          qty,
          winch,
          cpf
        });
      }
    });
  }

  // 2. Parse vehicle sheets
  workbook.eachSheet((worksheet) => {
    const sheetName = worksheet.name.trim();
    if (sheetName.toLowerCase() === 'sheet1' || sheetName.toLowerCase() === 'diesel issued date') {
      return;
    }

    const vehicleId = sheetName.replace(/\s+/g, '-').toUpperCase();
    const vehicleName = sheetName;
    const batches = [];
    
    let currentBatch = null;
    let isReadingEntries = false;
    let tableHeaderColMap = null; // maps field to col index

    const rows = [];
    worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      const cellValues = [];
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cellValues[colNumber] = cell.value;
      });
      rows.push({ rowNumber, cells: cellValues });
    });

    for (let i = 0; i < rows.length; i++) {
      const { rowNumber, cells } = rows[i];
      const lineStr = cells.map(c => formatCellValue(c)).join(' ').toLowerCase();

      // Check if this row marks a new batch (Last date of issue, or QTY issue)
      const isIssueMarker = lineStr.includes('last date of') || 
                            lineStr.includes('fsd issue') || 
                            lineStr.includes('hsd issue') ||
                            (lineStr.includes('qty:') && !lineStr.includes('total')) ||
                            (lineStr.includes('quantity(lt)') && !lineStr.includes('total'));

      if (isIssueMarker) {
        // Finalize current batch if exists
        if (currentBatch && currentBatch.entries.length > 0) {
          batches.push(calculateBatchMetrics(currentBatch));
        }

        // Extract issue date and qty from line or nearby cells
        let issueDate = '';
        let issuedQty = 0;
        let batchYear = '';

        // Check cells in current row and 1 row above/below
        const searchCells = [...(cells || [])];
        if (rows[i - 1]) searchCells.push(...rows[i - 1].cells);
        if (rows[i + 1]) searchCells.push(...rows[i + 1].cells);

        for (const c of searchCells) {
          if (!c) continue;
          const s = formatCellValue(c);
          if (c instanceof Date) {
            issueDate = parseDateStr(c);
          } else {
            // Check for date pattern
            const dateMatch = s.match(/(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/);
            if (dateMatch && !issueDate) {
              issueDate = parseDateStr(dateMatch[1]);
            }
            // Check for QTY pattern like QTY:200 L or Quantity(lt) 300
            const qtyMatch = s.match(/(?:qty|quantity)[:\s]*([0-9.]+)/i);
            if (qtyMatch) {
              issuedQty = parseFloat(qtyMatch[1]);
            }
            // Check for Year like 2021-22
            const yearMatch = s.match(/(\d{4}[-/]\d{2,4})/);
            if (yearMatch && !batchYear) {
              batchYear = yearMatch[1];
            }
          }
        }

        // Also check if next cell has quantity directly
        for (let col = 1; col < cells.length; col++) {
          const val = cells[col];
          const nextVal = cells[col + 1];
          if (formatCellValue(val).toLowerCase().includes('quantity') && typeof nextVal === 'number') {
            issuedQty = nextVal;
          }
        }

        currentBatch = {
          id: `${vehicleId}-b${batches.length + 1}`,
          batchNumber: batches.length + 1,
          vehicleId,
          year: batchYear || 'Current',
          issueDate: issueDate || 'N/A',
          issuedQty: issuedQty || 0,
          truckAvg: 3,
          engineAvg: 4,
          entries: [],
          remarks: ''
        };
        isReadingEntries = false;
        tableHeaderColMap = null;
        continue;
      }

      // Check if this row is the column header for the trip log
      if (lineStr.includes('date') && (lineStr.includes('distance') || lineStr.includes('details') || lineStr.includes('winch movement'))) {
        isReadingEntries = true;
        tableHeaderColMap = {};
        for (let col = 1; col < cells.length; col++) {
          const val = formatCellValue(cells[col]).toLowerCase();
          if (val.includes('date')) tableHeaderColMap.date = col;
          else if (val.includes('detail') || val.includes('movement')) tableHeaderColMap.details = col;
          else if (val.includes('dist')) tableHeaderColMap.distance = col;
          else if (val.includes('job')) tableHeaderColMap.job = col;
          else if (val.includes('engine') || val.includes('run') || val.includes('power pack')) tableHeaderColMap.engine = col;
          else if (val.includes('remark')) tableHeaderColMap.remarks = col;
        }
        // Fallback default column indexes if header detected
        if (!tableHeaderColMap.date) tableHeaderColMap.date = 1;
        if (!tableHeaderColMap.details) tableHeaderColMap.details = 2;
        if (!tableHeaderColMap.distance) tableHeaderColMap.distance = 3;
        if (!tableHeaderColMap.job) tableHeaderColMap.job = 4;
        if (!tableHeaderColMap.engine) tableHeaderColMap.engine = 5;
        if (!tableHeaderColMap.remarks) tableHeaderColMap.remarks = 6;
        continue;
      }

      // Check if this row is a summary / calculation block
      const isSummaryMarker = lineStr.includes('total distance') || 
                              lineStr.includes('truck average') || 
                              lineStr.includes('engine average') || 
                              lineStr.includes('by road') || 
                              lineStr.includes('sur plus stock') ||
                              lineStr.includes('hsd consumption by road') ||
                              lineStr.includes('power pack engine average');

      if (isSummaryMarker) {
        isReadingEntries = false;
        if (currentBatch) {
          // Extract truckAvg and engineAvg if present
          for (let col = 1; col < cells.length; col++) {
            const cellText = formatCellValue(cells[col]).toLowerCase();
            const nextVal = parseNumeric(cells[col + 1] || cells[col + 2]);
            if (cellText.includes('truck average') && nextVal > 0) {
              currentBatch.truckAvg = nextVal;
            }
            if ((cellText.includes('engine average') || cellText.includes('power pack engine average')) && nextVal > 0) {
              currentBatch.engineAvg = nextVal;
            }
          }
        }
        continue;
      }

      // If reading entries, check if current row contains a trip log
      if (isReadingEntries && currentBatch && tableHeaderColMap) {
        const dateVal = cells[tableHeaderColMap.date];
        const detailsVal = formatCellValue(cells[tableHeaderColMap.details]);
        const distVal = parseNumeric(cells[tableHeaderColMap.distance], 0);
        const jobVal = formatCellValue(cells[tableHeaderColMap.job]);
        const engineVal = parseNumeric(cells[tableHeaderColMap.engine], 0);
        const remarksVal = formatCellValue(cells[tableHeaderColMap.remarks]);

        // A valid trip entry has a date or movement details or distance/engine hours > 0
        const parsedDate = parseDateStr(dateVal);
        if (parsedDate || detailsVal || distVal > 0 || engineVal > 0 || jobVal) {
          // Don't treat summary rows as entries
          if (!detailsVal.toLowerCase().includes('total') && !detailsVal.toLowerCase().includes('average')) {
            currentBatch.entries.push({
              id: `${currentBatch.id}-e${currentBatch.entries.length + 1}`,
              date: parsedDate || 'N/A',
              details: detailsVal || '',
              distance: distVal,
              job: jobVal || '',
              engineHours: engineVal,
              remarks: remarksVal || ''
            });
          }
        }
      }
    }

    // Finalize last batch
    if (currentBatch && currentBatch.entries.length > 0) {
      batches.push(calculateBatchMetrics(currentBatch));
    }

    // If no batches detected (e.g. simple table), create a single default batch
    if (batches.length === 0) {
      const defaultBatch = {
        id: `${vehicleId}-b1`,
        batchNumber: 1,
        vehicleId,
        year: 'Current',
        issueDate: 'N/A',
        issuedQty: 0,
        truckAvg: 3,
        engineAvg: 4,
        entries: [],
        remarks: ''
      };
      batches.push(calculateBatchMetrics(defaultBatch));
    }

    vehicles.push({
      id: vehicleId,
      name: vehicleName,
      type: 'Reservoir Winch',
      batches
    });
  });

  return {
    vehicles,
    dieselIssuedRecords,
    parsedAt: new Date().toISOString()
  };
}
