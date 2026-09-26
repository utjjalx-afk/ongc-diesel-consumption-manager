import ExcelJS from 'exceljs';
import { calculateFleetSummary } from './calculator.js';

export async function generateExcelWorkbook(data) {
  const { vehicles, fleetSummary } = calculateFleetSummary(data.vehicles || []);
  const issuedRecords = data.dieselIssuedRecords || [];

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'ONGC Diesel Consumption System';
  workbook.lastModifiedBy = 'ONGC Logbook System';
  workbook.created = new Date();
  workbook.modified = new Date();

  // Palette
  const THEME_TEAL = 'FF0D5C75';
  const THEME_LIGHT_TEAL = 'FFE0F2F1';
  const THEME_GOLD = 'FFFFC107';
  const THEME_LIGHT_GRAY = 'FFF4F6F8';
  const BORDER_THIN = {
    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
  };

  // ==========================================
  // 1. FLEET SUMMARY SHEET
  // ==========================================
  const summarySheet = workbook.addWorksheet('Fleet Summary', {
    views: [{ showGridLines: true }]
  });

  // Title
  summarySheet.mergeCells('A1:I1');
  const titleCell = summarySheet.getCell('A1');
  titleCell.value = 'OIL AND NATURAL GAS CORPORATION LIMITED (ONGC)';
  titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME_TEAL } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  summarySheet.getRow(1).height = 30;

  summarySheet.mergeCells('A2:I2');
  const subTitleCell = summarySheet.getCell('A2');
  subTitleCell.value = `RESERVOIR WINCH FLEET DIESEL CONSUMPTION SUMMARY - Generated on ${new Date().toLocaleDateString('en-GB')}`;
  subTitleCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF334155' } };
  subTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME_LIGHT_TEAL } };
  subTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  summarySheet.getRow(2).height = 24;

  // Table Headers
  const headers = [
    'Vehicle Registration', 'Batches', 'Total Issued (L)', 'Total Distance (km)',
    'Engine Run (hr)', 'Road HSD (L)', 'Engine HSD (L)', 'Total Consumed (L)', 'Net Balance (L)'
  ];

  const headerRow = summarySheet.getRow(4);
  headers.forEach((h, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = h;
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME_TEAL } };
    cell.alignment = { horizontal: idx === 0 ? 'left' : 'right', vertical: 'middle' };
    cell.border = BORDER_THIN;
  });
  headerRow.height = 26;

  let rIdx = 5;
  vehicles.forEach((v) => {
    const row = summarySheet.getRow(rIdx);
    row.getCell(1).value = v.name;
    row.getCell(2).value = v.totals.batchCount;
    row.getCell(3).value = v.totals.totalIssued;
    row.getCell(4).value = v.totals.totalDistance;
    row.getCell(5).value = v.totals.totalEngineHours;
    row.getCell(6).value = v.totals.totalRoadConsumption;
    row.getCell(7).value = v.totals.totalEngineConsumption;
    row.getCell(8).value = v.totals.totalConsumed;
    
    const balanceCell = row.getCell(9);
    balanceCell.value = v.totals.currentBalance;
    if (v.totals.currentBalance < 30) {
      balanceCell.font = { bold: true, color: { argb: 'FFDC2626' } };
    }

    for (let c = 1; c <= 9; c++) {
      const cell = row.getCell(c);
      cell.border = BORDER_THIN;
      if (c > 1) cell.alignment = { horizontal: 'right' };
      if (rIdx % 2 === 0) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      }
    }
    rIdx++;
  });

  // Totals Row
  const totalRow = summarySheet.getRow(rIdx);
  totalRow.getCell(1).value = 'TOTAL FLEET';
  totalRow.getCell(2).value = fleetSummary.totalBatches;
  totalRow.getCell(3).value = fleetSummary.totalIssued;
  totalRow.getCell(4).value = fleetSummary.totalDistance;
  totalRow.getCell(5).value = fleetSummary.totalEngineHours;
  totalRow.getCell(6).value = fleetSummary.totalRoadConsumption;
  totalRow.getCell(7).value = fleetSummary.totalEngineConsumption;
  totalRow.getCell(8).value = fleetSummary.totalConsumed;
  totalRow.getCell(9).value = fleetSummary.fleetBalance;

  for (let c = 1; c <= 9; c++) {
    const cell = totalRow.getCell(c);
    cell.font = { bold: true, color: { argb: 'FF0F172A' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME_LIGHT_TEAL } };
    cell.border = BORDER_THIN;
    if (c > 1) cell.alignment = { horizontal: 'right' };
  }
  totalRow.height = 24;

  // Auto column widths
  summarySheet.columns = [
    { width: 26 }, { width: 12 }, { width: 18 }, { width: 20 },
    { width: 16 }, { width: 16 }, { width: 16 }, { width: 20 }, { width: 18 }
  ];

  // ==========================================
  // 2. DIESEL ISSUED DATE SHEET
  // ==========================================
  const issuedWs = workbook.addWorksheet('Diesel Issued Date', {
    views: [{ showGridLines: true }]
  });

  issuedWs.mergeCells('A1:D1');
  const dTitle = issuedWs.getCell('A1');
  dTitle.value = 'DETAILS OF HSD ISSUED TO WINCHES';
  dTitle.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  dTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME_TEAL } };
  dTitle.alignment = { horizontal: 'center', vertical: 'middle' };
  issuedWs.getRow(1).height = 28;

  const dHeaders = ['INDENT DATE', 'Diesel Qty (L)', 'Winch', 'Diesel Collector CPF'];
  const dHeaderRow = issuedWs.getRow(3);
  dHeaders.forEach((h, idx) => {
    const cell = dHeaderRow.getCell(idx + 1);
    cell.value = h;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME_TEAL } };
    cell.alignment = { horizontal: idx === 1 ? 'right' : 'center', vertical: 'middle' };
    cell.border = BORDER_THIN;
  });

  let dIdx = 4;
  issuedRecords.forEach(rec => {
    const row = issuedWs.getRow(dIdx);
    row.getCell(1).value = rec.indentDate;
    row.getCell(2).value = rec.qty;
    row.getCell(3).value = rec.winch;
    row.getCell(4).value = rec.cpf;
    for (let c = 1; c <= 4; c++) {
      row.getCell(c).border = BORDER_THIN;
      if (c === 2) row.getCell(c).alignment = { horizontal: 'right' };
      else row.getCell(c).alignment = { horizontal: 'center' };
    }
    dIdx++;
  });

  issuedWs.columns = [{ width: 18 }, { width: 18 }, { width: 22 }, { width: 24 }];

  // ==========================================
  // 3. VEHICLE LOG SHEETS
  // ==========================================
  vehicles.forEach((vehicle) => {
    // Sheet name max length in Excel is 31 chars
    const sheetTitle = vehicle.name.substring(0, 31);
    const vWs = workbook.addWorksheet(sheetTitle, {
      views: [{ showGridLines: true }]
    });

    let curRow = 1;

    // Vehicle Top Header
    vWs.mergeCells(`A${curRow}:F${curRow}`);
    const vHeader = vWs.getCell(`A${curRow}`);
    vHeader.value = `${vehicle.name} (Reservoir Winch Logbook)`;
    vHeader.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    vHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME_TEAL } };
    vHeader.alignment = { horizontal: 'center', vertical: 'middle' };
    vWs.getRow(curRow).height = 28;
    curRow += 2;

    (vehicle.batches || []).forEach((batch, bIdx) => {
      // Batch info header
      vWs.mergeCells(`A${curRow}:F${curRow}`);
      const bInfo = vWs.getCell(`A${curRow}`);
      bInfo.value = `Batch #${bIdx + 1} | Year: ${batch.year || 'N/A'} | Last Date of Issue: ${batch.issueDate || 'N/A'} | Issued QTY: ${batch.issuedQty} L`;
      bInfo.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF0F172A' } };
      bInfo.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME_LIGHT_TEAL } };
      bInfo.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
      vWs.getRow(curRow).height = 22;
      curRow++;

      // Column Headers
      const colHeaders = ['Date', 'Details of Winch Movement', 'Distance (km)', 'Job Carried Out', 'Engine Run (hr)', 'Remarks'];
      const vHRow = vWs.getRow(curRow);
      colHeaders.forEach((ch, idx) => {
        const cell = vHRow.getCell(idx + 1);
        cell.value = ch;
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
        cell.alignment = { horizontal: (idx === 2 || idx === 4) ? 'right' : 'left', vertical: 'middle' };
        cell.border = BORDER_THIN;
      });
      vHRow.height = 22;
      curRow++;

      const entriesStartRow = curRow;
      (batch.entries || []).forEach(entry => {
        const row = vWs.getRow(curRow);
        row.getCell(1).value = entry.date;
        row.getCell(2).value = entry.details;
        row.getCell(3).value = entry.distance;
        row.getCell(4).value = entry.job;
        row.getCell(5).value = entry.engineHours;
        row.getCell(6).value = entry.remarks;

        for (let c = 1; c <= 6; c++) {
          const cell = row.getCell(c);
          cell.border = BORDER_THIN;
          if (c === 3 || c === 5) cell.alignment = { horizontal: 'right' };
        }
        curRow++;
      });
      const entriesEndRow = curRow - 1;

      // Batch summary block
      curRow++; // empty row

      // Summary Table
      vWs.getCell(`A${curRow}`).value = 'Total Distance (km)';
      vWs.getCell(`C${curRow}`).value = batch.totalDistance;
      vWs.getCell(`D${curRow}`).value = 'Total Engine Run (Hr)';
      vWs.getCell(`E${curRow}`).value = batch.totalEngineHours;
      vWs.getRow(curRow).font = { bold: true };
      curRow++;

      vWs.getCell(`A${curRow}`).value = 'Truck Average Fuel Consumption (km/l)';
      vWs.getCell(`C${curRow}`).value = batch.truckAvg;
      vWs.getCell(`D${curRow}`).value = 'BY ROAD (liter)';
      vWs.getCell(`E${curRow}`).value = batch.roadConsumption;
      curRow++;

      vWs.getCell(`A${curRow}`).value = 'Total Distance Travelled (km)';
      vWs.getCell(`C${curRow}`).value = batch.totalDistance;
      curRow++;

      vWs.getCell(`A${curRow}`).value = 'Engine Average Fuel Consumption (l/hr)';
      vWs.getCell(`C${curRow}`).value = batch.engineAvg;
      vWs.getCell(`D${curRow}`).value = 'JOB (Engine Run) (liter)';
      vWs.getCell(`E${curRow}`).value = batch.engineConsumption;
      curRow++;

      vWs.getCell(`A${curRow}`).value = 'Total duration of Engine Operation (hr)';
      vWs.getCell(`C${curRow}`).value = batch.totalEngineHours;
      vWs.getCell(`D${curRow}`).value = 'TOTAL (HSD) (liter)';
      vWs.getCell(`E${curRow}`).value = batch.totalConsumed;
      vWs.getCell(`D${curRow}`).font = { bold: true };
      vWs.getCell(`E${curRow}`).font = { bold: true, color: { argb: 'FF0D5C75' } };
      curRow++;

      vWs.getCell(`D${curRow}`).value = 'SUR PLUS STOCK (liter)';
      vWs.getCell(`E${curRow}`).value = batch.surplusStock;
      vWs.getCell(`D${curRow}`).font = { bold: true };
      vWs.getCell(`E${curRow}`).font = {
        bold: true,
        color: { argb: batch.surplusStock < 30 ? 'FFDC2626' : 'FF16A34A' }
      };
      curRow++;

      // Safety note
      vWs.mergeCells(`A${curRow}:F${curRow}`);
      const noteCell = vWs.getCell(`A${curRow}`);
      noteCell.value = '* 30 LITER DIESEL SHOULD BE KEPT AS RESERVE TO AVOID AIR LOCKING.';
      noteCell.font = { italic: true, size: 9, color: { argb: 'FF64748B' } };
      curRow += 3; // spacing between batches
    });

    vWs.columns = [
      { width: 14 }, { width: 36 }, { width: 16 }, { width: 28 }, { width: 16 }, { width: 25 }
    ];
  });

  return workbook.xlsx.writeBuffer();
}
