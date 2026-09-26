import ExcelJS from 'exceljs';

async function inspectOT() {
  console.log('=== INSPECTING OT_APRIL_2024_Macros.xlsm ===');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile('C:/Users/utjja/Downloads/OT_APRIL_2024_Macros.xlsm');
  console.log('Sheet names in OT workbook:');
  wb.eachSheet((sheet, id) => {
    console.log(`Sheet ID: ${id}, Name: "${sheet.name}", RowCount: ${sheet.rowCount}, ColCount: ${sheet.columnCount}`);
  });

  for (const sheet of wb.worksheets) {
    console.log(`\n--- First 30 rows of sheet "${sheet.name}" ---`);
    for (let r = 1; r <= Math.min(30, sheet.rowCount); r++) {
      const row = sheet.getRow(r);
      const values = [];
      for (let c = 1; c <= Math.min(20, sheet.columnCount); c++) {
        const cell = row.getCell(c);
        let val = cell.value;
        if (val && typeof val === 'object') {
          if (val.result !== undefined) val = `formula[${val.formula}] => ${val.result}`;
          else if (val.text) val = val.text;
          else if (val instanceof Date) val = val.toISOString().split('T')[0];
        }
        values.push(val !== null && val !== undefined ? String(val).trim() : '');
      }
      if (values.some(v => v !== '')) {
        console.log(`R${r}:`, values.filter((_, i) => i < 15).join(' | '));
      }
    }
  }
}

async function inspectFDE() {
  console.log('\n=== INSPECTING FDE  JANUARY 2025.xlsx ===');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile('C:/Users/utjja/Downloads/FDE  JANUARY 2025.xlsx');
  console.log('Sheet names in FDE workbook:');
  wb.eachSheet((sheet, id) => {
    console.log(`Sheet ID: ${id}, Name: "${sheet.name}", RowCount: ${sheet.rowCount}, ColCount: ${sheet.columnCount}`);
  });

  for (const sheet of wb.worksheets) {
    console.log(`\n--- First 30 rows of sheet "${sheet.name}" ---`);
    for (let r = 1; r <= Math.min(30, sheet.rowCount); r++) {
      const row = sheet.getRow(r);
      const values = [];
      for (let c = 1; c <= Math.min(20, sheet.columnCount); c++) {
        const cell = row.getCell(c);
        let val = cell.value;
        if (val && typeof val === 'object') {
          if (val.result !== undefined) val = `formula[${val.formula}] => ${val.result}`;
          else if (val.text) val = val.text;
          else if (val instanceof Date) val = val.toISOString().split('T')[0];
        }
        values.push(val !== null && val !== undefined ? String(val).trim() : '');
      }
      if (values.some(v => v !== '')) {
        console.log(`R${r}:`, values.filter((_, i) => i < 15).join(' | '));
      }
    }
  }
}

async function main() {
  try {
    await inspectOT();
  } catch (e) {
    console.error('OT inspection error:', e);
  }
  try {
    await inspectFDE();
  } catch (e) {
    console.error('FDE inspection error:', e);
  }
}

main();
