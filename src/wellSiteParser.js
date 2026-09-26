import ExcelJS from 'exceljs';
import fs from 'fs';

export async function parseWellSiteInfo(filePathOrBuffer) {
  const workbook = new ExcelJS.Workbook();
  if (typeof filePathOrBuffer === 'string') {
    if (!fs.existsSync(filePathOrBuffer)) {
      throw new Error(`Well site file not found at ${filePathOrBuffer}`);
    }
    await workbook.xlsx.readFile(filePathOrBuffer);
  } else {
    await workbook.xlsx.load(filePathOrBuffer);
  }

  // Use Sheet2 or Sheet1 (Sheet2 has field names like BORHOLA, BALIJAN, etc.)
  const worksheet = workbook.getWorksheet('Sheet2') || workbook.getWorksheet('Sheet1') || workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('No valid worksheet found in well site info workbook');
  }

  const clusters = [];
  const wellList = [];
  const fieldsMap = {};

  let currentField = 'GENERAL';

  worksheet.eachRow((row, rowNumber) => {
    const col1 = (row.getCell(1).text || '').trim();
    const col3 = (row.getCell(3).text || '').trim();

    if (!col1 && !col3) return;

    // Ignore title rows
    if (col1.toLowerCase().includes('well site') || col1.toLowerCase().includes('last update')) {
      return;
    }

    // Check if col1 or col3 is a section header like "BORHOLA", "BALIJAN", "MOKRONG"
    // Usually section headers have "WELL NO." in col3 or col1 is uppercase single name
    if (col3.toLowerCase().includes('well no.') || col1 === 'BORHOLA' || col1 === 'BALIJAN' || col1 === 'MOKRONG' || col1 === 'KHORAGHAT KH' || col1 === 'NAMBAR KH SITE') {
      currentField = col1.replace(/well no\./i, '').trim() || currentField;
      return;
    }

    // Cluster name in col1, well numbers in col3
    const clusterName = col1;
    const rawWells = col3;

    if (clusterName && rawWells && !rawWells.toLowerCase().includes('well no.')) {
      // Clean and split well numbers (comma, semicolon, or period separated)
      const cleanedWells = rawWells
        .replace(/^\./, '')
        .split(/[,;\n]+/)
        .map(w => w.trim().toUpperCase())
        .filter(w => w.length > 0 && w !== 'WELL NO.');

      const clusterObj = {
        id: `cluster-${clusters.length + 1}`,
        field: currentField,
        clusterName,
        wells: cleanedWells,
        rawText: rawWells
      };

      clusters.push(clusterObj);

      if (!fieldsMap[currentField]) {
        fieldsMap[currentField] = [];
      }
      fieldsMap[currentField].push(clusterObj);

      cleanedWells.forEach(well => {
        wellList.push({
          wellName: well,
          clusterName,
          field: currentField
        });
      });
    }
  });

  return {
    sourceFile: typeof filePathOrBuffer === 'string' ? filePathOrBuffer : 'Uploaded File',
    totalClusters: clusters.length,
    totalWells: wellList.length,
    fields: Object.keys(fieldsMap).map(fName => ({
      fieldName: fName,
      clusterCount: fieldsMap[fName].length,
      clusters: fieldsMap[fName]
    })),
    clusters,
    wells: wellList,
    parsedAt: new Date().toISOString()
  };
}

export function rebuildWellSiteStructure(clusters, sourceFile = 'User Modified') {
  const wellList = [];
  const fieldsMap = {};

  clusters.forEach(c => {
    const fName = (c.field || 'GENERAL').trim().toUpperCase();
    if (!fieldsMap[fName]) fieldsMap[fName] = [];
    fieldsMap[fName].push(c);

    (c.wells || []).forEach(w => {
      const cleanW = (w || '').trim().toUpperCase();
      if (cleanW) {
        wellList.push({
          wellName: cleanW,
          clusterName: c.clusterName,
          field: fName
        });
      }
    });
  });

  return {
    sourceFile,
    totalClusters: clusters.length,
    totalWells: wellList.length,
    fields: Object.keys(fieldsMap).map(fName => ({
      fieldName: fName,
      clusterCount: fieldsMap[fName].length,
      clusters: fieldsMap[fName]
    })),
    clusters,
    wells: wellList,
    lastUpdated: new Date().toISOString()
  };
}
