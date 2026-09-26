import ExcelJS from 'exceljs';

async function inspectOTDetailed() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile('C:/Users/utjja/Downloads/OT_APRIL_2024_Macros.xlsm');
  console.log('OT Workbook Sheets:');
  wb.eachSheet((s, id) => console.log(`[${id}] "${s.name}" (rows: ${s.rowCount}, cols: ${s.columnCount})`));

  for (const sheet of wb.worksheets) {
    console.log(`\n======================================================`);
    console.log(`SHEET: "${sheet.name}"`);
    console.log(`======================================================`);
    for (let r = 1; r <= Math.min(50, sheet.rowCount); r++) {
      const row = sheet.getRow(r);
      const cells = [];
      for (let c = 1; c <= Math.min(25, sheet.columnCount); c++) {
        const cell = row.getCell(c);
        let val = cell.value;
        if (val && typeof val === 'object') {
          if (val.result !== undefined) val = `[F:${val.formula} => ${val.result}]`;
          else if (val.text) val = val.text;
          else if (val instanceof Date) val = val.toISOString().split('T')[0];
        }
        if (val !== null && val !== undefined && String(val).trim() !== '') {
          cells.push(`C${c}: ${String(val).trim()}`);
        }
      }
      if (cells.length > 0) {
        console.log(`R${r}: ${cells.join(' | ')}`);
      }
    }
  }
}

inspectOTDetailed().catch(console.error);
