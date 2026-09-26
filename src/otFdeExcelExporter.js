import ExcelJS from 'exceljs';

/**
 * Generate Excel workbook for an OT or FDE statement matching Form No. CLM-MIS-02
 * @param {Object} statement - Employee claim statement object
 * @param {'ot'|'fde'} type - Statement type ('ot' or 'fde')
 */
export async function generateClaimExcel(statement, type = 'ot') {
  const isOt = type.toLowerCase() === 'ot';
  const employee = statement.employee || {};
  const entries = statement.entries || [];
  const title = isOt ? 'OVERTIME CLAIM' : 'FIELD DUTY EXPENDITURE';

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'ONGC Operations Portal';
  workbook.created = new Date();

  const sheetName = employee.code || (isOt ? 'OT Claim' : 'FDE Claim');
  const ws = workbook.addWorksheet(sheetName, {
    views: [{ showGridLines: true }]
  });

  // Theme styles
  const BORDER_THIN = {
    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
  };

  // Row 1: Form No.
  ws.mergeCells('F1:H1');
  const fCell = ws.getCell('F1');
  fCell.value = 'Form No. CLM-MIS-02';
  fCell.font = { name: 'Calibri', size: 9, italic: true };
  fCell.alignment = { horizontal: 'right' };

  // Row 2-3: Header
  ws.mergeCells('A2:H2');
  const h2 = ws.getCell('A2');
  h2.value = 'OIL AND NATURAL GAS CORPORATION LTD';
  h2.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF0B2545' } };
  h2.alignment = { horizontal: 'center' };

  ws.mergeCells('A3:H3');
  const h3 = ws.getCell('A3');
  h3.value = 'Assam Asset • Reservoir Winch Section (SST Jorhat)';
  h3.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF475569' } };
  h3.alignment = { horizontal: 'center' };

  // Row 5: Title
  ws.mergeCells('A5:H5');
  const tCell = ws.getCell('A5');
  tCell.value = title;
  tCell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF991B1B' } };
  tCell.alignment = { horizontal: 'center' };

  // Row 7: CPF & Name
  ws.getCell('A7').value = 'CPF No.';
  ws.getCell('A7').font = { bold: true };
  ws.getCell('B7').value = employee.cpf || '140751';

  ws.getCell('D7').value = 'Name:';
  ws.getCell('D7').font = { bold: true };
  ws.mergeCells('E7:H7');
  ws.getCell('E7').value = employee.name || 'UTJJAL CHETIA';
  ws.getCell('E7').font = { bold: true };

  // Row 8: Designation & Section
  ws.getCell('A8').value = 'Designation:';
  ws.getCell('A8').font = { bold: true };
  ws.getCell('B8').value = employee.designation || 'JMVD(W.O.)';

  ws.getCell('D8').value = 'Section/Site :';
  ws.getCell('D8').font = { bold: true };
  ws.mergeCells('E8:H8');
  ws.getCell('E8').value = employee.section || 'SST';

  // Row 9: Org Unit & Location
  ws.getCell('A9').value = 'Org. Unit:';
  ws.getCell('A9').font = { bold: true };
  ws.getCell('B9').value = employee.orgUnit || 'ONGCL';

  ws.getCell('D9').value = 'Location:';
  ws.getCell('D9').font = { bold: true };
  ws.mergeCells('E9:H9');
  ws.getCell('E9').value = employee.location || 'JORHAT';

  // Row 11: Bill No., Basic Pay, DA
  ws.getCell('A11').value = 'Bill No.';
  ws.getCell('A11').font = { bold: true };
  ws.getCell('B11').value = employee.billNo || '473';

  ws.getCell('D11').value = 'Basic Pay (Rs.):';
  ws.getCell('D11').font = { bold: true };
  ws.getCell('E11').value = Number(employee.basicPay || 28230);

  ws.getCell('G11').value = 'DA (Rs.):';
  ws.getCell('G11').font = { bold: true };
  ws.getCell('H11').value = Number(employee.da || 14002);

  // Row 12: Rate & Month
  if (isOt) {
    ws.getCell('A12').value = 'Rate/Hrs. (Rs.):';
    ws.getCell('A12').font = { bold: true };
    ws.getCell('B12').value = Number(employee.otRate || 406);
    ws.getCell('B12').font = { bold: true, color: { argb: 'FF991B1B' } };
  } else {
    ws.getCell('A12').value = 'Rate/shift. (Rs.):';
    ws.getCell('A12').font = { bold: true };
    ws.getCell('B12').value = 450;
    ws.getCell('B12').font = { bold: true, color: { argb: 'FF991B1B' } };
  }

  ws.getCell('D12').value = 'Month:';
  ws.getCell('D12').font = { bold: true };
  ws.getCell('E12').value = statement.month || '2025-01';

  // Table Headers (Row 15-16)
  const headerRow = ws.getRow(15);
  if (isOt) {
    headerRow.values = ['Date', 'Dep. Time', 'Arr. Time', 'Total Hrs.', 'OT', 'Remarks'];
  } else {
    headerRow.values = ['Date', 'Dep. Time', 'Arr. Time', 'Duty in Field(hrs)', 'Location', 'Remarks'];
  }
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.height = 24;
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  
  for (let c = 1; c <= 6; c++) {
    const cell = headerRow.getCell(c);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F3B5F' } };
    cell.border = BORDER_THIN;
  }

  // Populate data rows from 16 onwards
  let rIdx = 16;
  for (const item of entries) {
    const row = ws.getRow(rIdx);
    if (isOt) {
      row.values = [
        item.date,
        item.depTime,
        item.arrTime,
        item.dutyHours,
        item.otHours,
        item.remarks
      ];
    } else {
      row.values = [
        item.date,
        item.depTime,
        item.arrTime,
        item.dutyHours,
        item.location,
        item.remarks
      ];
    }

    row.height = 20;
    row.alignment = { vertical: 'middle' };
    row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };

    for (let c = 1; c <= 6; c++) {
      row.getCell(c).border = BORDER_THIN;
    }

    rIdx++;
  }

  // Summary Row
  const sumRow = ws.getRow(rIdx);
  sumRow.height = 24;
  if (isOt) {
    sumRow.getCell(2).value = 'Total Hrs.';
    sumRow.getCell(2).font = { bold: true };
    sumRow.getCell(3).value = statement.totalOtHours;
    sumRow.getCell(3).font = { bold: true };
    
    sumRow.getCell(5).value = 'Total Rs.';
    sumRow.getCell(5).font = { bold: true };
    sumRow.getCell(6).value = statement.totalOtAmount;
    sumRow.getCell(6).font = { bold: true, color: { argb: 'FF991B1B' } };
  } else {
    sumRow.getCell(1).value = 'Total Hrs. in field';
    sumRow.getCell(1).font = { bold: true };
    sumRow.getCell(2).value = statement.totalFieldHours;
    sumRow.getCell(2).font = { bold: true };

    sumRow.getCell(3).value = 'Total Shift:';
    sumRow.getCell(3).font = { bold: true };
    sumRow.getCell(4).value = statement.totalShifts;
    sumRow.getCell(4).font = { bold: true };

    sumRow.getCell(5).value = 'Total Rs.';
    sumRow.getCell(5).font = { bold: true };
    sumRow.getCell(6).value = statement.totalFdAmount;
    sumRow.getCell(6).font = { bold: true, color: { argb: 'FF991B1B' } };
  }

  // Column widths
  ws.getColumn(1).width = 14;
  ws.getColumn(2).width = 12;
  ws.getColumn(3).width = 12;
  ws.getColumn(4).width = 18;
  ws.getColumn(5).width = 14;
  ws.getColumn(6).width = 45;

  return await workbook.xlsx.writeBuffer();
}

/**
 * Generate comprehensive Yearly Overtime & Field Duty Excel Report
 * @param {Object} yearlyData - Output of generateYearlyStatements
 */
export async function generateYearlyExcel(yearlyData) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'ONGC Operations Portal';
  workbook.created = new Date();

  const year = yearlyData.year || '2025';
  const summary = yearlyData.summary || {};
  const months = yearlyData.months || [];
  const employees = yearlyData.employees || [];

  const BORDER_THIN = {
    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
  };

  // -------------------------------------------------------------
  // Sheet 1: Annual Fleet Overtime Summary
  // -------------------------------------------------------------
  const ws1 = workbook.addWorksheet(`Annual OT Summary ${year}`, { views: [{ showGridLines: true }] });

  ws1.mergeCells('A1:G1');
  const h1 = ws1.getCell('A1');
  h1.value = 'OIL AND NATURAL GAS CORPORATION LIMITED';
  h1.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF0B2545' } };
  h1.alignment = { horizontal: 'center' };

  ws1.mergeCells('A2:G2');
  const h2 = ws1.getCell('A2');
  h2.value = `Assam Asset • Reservoir Winch Section • Annual Overtime (OT) & Field Duty Report - ${year}`;
  h2.font = { name: 'Calibri', size: 11, italic: true, color: { argb: 'FF475569' } };
  h2.alignment = { horizontal: 'center' };

  // Annual KPIs
  ws1.getCell('A4').value = 'ANNUAL FLEET PERFORMANCE KPI';
  ws1.getCell('A4').font = { bold: true, color: { argb: 'FF0070F2' } };

  ws1.getRow(5).values = ['Total Field Trips', 'Total Field Hours', 'Total OT Hours', 'Total OT Amount (Rs)', 'Total FD Amount (Rs)', 'Gross Total (Rs)', 'Active Crew'];
  ws1.getRow(5).font = { bold: true };
  ws1.getRow(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };

  ws1.getRow(6).values = [
    summary.totalJobs || 0,
    summary.totalFieldHours || 0,
    summary.totalOtHours || 0,
    summary.totalOtAmount || 0,
    summary.totalFdAmount || 0,
    summary.totalCombinedAmount || 0,
    summary.totalCrewCount || 12
  ];
  ws1.getRow(6).font = { bold: true, size: 11 };

  // Month-by-Month Breakdown Table
  ws1.getCell('A8').value = 'MONTH-BY-MONTH BREAKDOWN';
  ws1.getCell('A8').font = { bold: true, color: { argb: 'FF0070F2' } };

  const mHeader = ws1.getRow(9);
  mHeader.values = ['Month', 'Field Trips', 'Field Hours', 'OT Hours', 'OT Amount (Rs)', 'FD Amount (Rs)', 'Total Payout (Rs)'];
  mHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  mHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };

  let r1 = 10;
  for (const m of months) {
    const row = ws1.getRow(r1);
    row.values = [
      m.monthName,
      m.totalTrips,
      m.totalFieldHours,
      m.totalOtHours,
      m.totalOtAmount,
      m.totalFdAmount,
      m.combinedAmount
    ];
    for (let c = 1; c <= 7; c++) {
      row.getCell(c).border = BORDER_THIN;
    }
    r1++;
  }

  // Month Table Totals Row
  const mTotal = ws1.getRow(r1);
  mTotal.values = [
    'ANNUAL TOTAL',
    summary.totalJobs,
    summary.totalFieldHours,
    summary.totalOtHours,
    summary.totalOtAmount,
    summary.totalFdAmount,
    summary.totalCombinedAmount
  ];
  mTotal.font = { bold: true };
  mTotal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
  for (let c = 1; c <= 7; c++) {
    mTotal.getCell(c).border = BORDER_THIN;
  }

  ws1.getColumn(1).width = 18;
  ws1.getColumn(2).width = 14;
  ws1.getColumn(3).width = 15;
  ws1.getColumn(4).width = 15;
  ws1.getColumn(5).width = 18;
  ws1.getColumn(6).width = 18;
  ws1.getColumn(7).width = 20;

  // -------------------------------------------------------------
  // Sheet 2: Crew-wise Annual Summary
  // -------------------------------------------------------------
  const ws2 = workbook.addWorksheet(`Crew Annual Ranking ${year}`, { views: [{ showGridLines: true }] });

  ws2.mergeCells('A1:I1');
  const h21 = ws2.getCell('A1');
  h21.value = `ONGC Assam Asset • Winch Operations • Crew Annual Overtime & Duty Earnings - ${year}`;
  h21.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF0B2545' } };
  h21.alignment = { horizontal: 'center' };

  const cHeader = ws2.getRow(3);
  cHeader.values = ['Code', 'Employee Name', 'CPF No.', 'Designation', 'OT Rate (Rs/hr)', 'Field Trips', 'Total OT (hrs)', 'Total OT Claim (Rs)', 'Total Gross (OT+FD Rs)'];
  cHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  cHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D5C75' } };

  let r2 = 4;
  for (const emp of employees) {
    const row = ws2.getRow(r2);
    row.values = [
      emp.code,
      emp.name,
      emp.cpf,
      emp.designation,
      emp.otRate,
      emp.totalTrips,
      emp.totalOtHours,
      emp.totalOtAmount,
      emp.combinedAmount
    ];
    for (let c = 1; c <= 9; c++) {
      row.getCell(c).border = BORDER_THIN;
    }
    r2++;
  }

  // Column widths
  ws2.getColumn(1).width = 10;
  ws2.getColumn(2).width = 26;
  ws2.getColumn(3).width = 14;
  ws2.getColumn(4).width = 22;
  ws2.getColumn(5).width = 16;
  ws2.getColumn(6).width = 14;
  ws2.getColumn(7).width = 16;
  ws2.getColumn(8).width = 20;
  ws2.getColumn(9).width = 22;

  return await workbook.xlsx.writeBuffer();
}
