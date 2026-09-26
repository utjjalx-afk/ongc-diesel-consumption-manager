import PDFDocument from 'pdfkit';
import { calculateVehicleTotals, calculateFleetSummary } from './calculator.js';

export function generatePdfReport(data, options = {}) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        bufferPages: true
      });

      const buffers = [];
      doc.on('data', b => buffers.push(b));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', err => reject(err));

      const { vehicleId, batchId } = options;
      const { vehicles, fleetSummary } = calculateFleetSummary(data.vehicles || []);

      // Palette
      const PRIMARY = '#0A4B5C';
      const SECONDARY = '#1E293B';
      const TEXT_MUTED = '#64748B';
      const BORDER_COLOR = '#CBD5E1';
      const ROW_ALT_BG = '#F8FAFC';
      const DANGER = '#DC2626';
      const SUCCESS = '#16A34A';

      // 1. Header Function
      function drawHeader(title, subtitle) {
        doc.rect(40, 35, 515, 60).fill(PRIMARY);
        doc.fillColor('#FFFFFF')
           .fontSize(14)
           .font('Helvetica-Bold')
           .text('OIL AND NATURAL GAS CORPORATION LIMITED (ONGC)', 40, 47, { align: 'center', width: 515 });
        doc.fontSize(10)
           .font('Helvetica')
           .text('RESERVOIR STUDY / WINCH SECTION - DIESEL CONSUMPTION LOG', 40, 65, { align: 'center', width: 515 });
        doc.fontSize(8)
           .text(`Report Date: ${new Date().toLocaleDateString('en-GB')} | Fleet Management System`, 40, 78, { align: 'center', width: 515 });

        doc.moveDown(2.5);
      }

      // If specific vehicle requested
      if (vehicleId) {
        const vehicle = vehicles.find(v => v.id === vehicleId || v.name === vehicleId);
        if (!vehicle) {
          doc.fontSize(14).fillColor(DANGER).text(`Vehicle not found: ${vehicleId}`, 40, 150);
          doc.end();
          return;
        }

        const batchesToPrint = batchId 
          ? vehicle.batches.filter(b => b.id === batchId || String(b.batchNumber) === String(batchId))
          : vehicle.batches;

        batchesToPrint.forEach((batch, idx) => {
          if (idx > 0) doc.addPage();
          drawHeader();

          // Vehicle & Batch Info Box
          const startY = 110;
          doc.rect(40, startY, 515, 45).fill('#F1F5F9');
          doc.rect(40, startY, 515, 45).stroke(BORDER_COLOR);

          doc.fillColor(PRIMARY).font('Helvetica-Bold').fontSize(12);
          doc.text(`Vehicle: ${vehicle.name}`, 50, startY + 8);
          doc.fontSize(9).font('Helvetica').fillColor(SECONDARY);
          doc.text(`Batch #${batch.batchNumber} (${batch.year || 'Current Year'})`, 50, startY + 26);
          doc.text(`Issue Date: ${batch.issueDate || 'N/A'}`, 250, startY + 8);
          doc.text(`Diesel Issued: ${batch.issuedQty} Liters`, 250, startY + 26);
          doc.text(`Truck Avg: ${batch.truckAvg} km/L`, 410, startY + 8);
          doc.text(`Engine Avg: ${batch.engineAvg} L/hr`, 410, startY + 26);

          // Summary Metrics Grid
          const kpiY = startY + 55;
          const kpiWidth = 120;
          const kpiHeight = 45;

          const kpis = [
            { label: 'Total Distance', val: `${batch.totalDistance} km`, col: '#0284C7' },
            { label: 'Total Engine Run', val: `${batch.totalEngineHours} hrs`, col: '#4F46E5' },
            { label: 'Total Consumed', val: `${batch.totalConsumed} L`, col: '#D97706' },
            { label: 'Surplus / Balance', val: `${batch.surplusStock} L`, col: batch.surplusStock < 30 ? DANGER : SUCCESS }
          ];

          kpis.forEach((k, i) => {
            const x = 40 + i * 131;
            doc.rect(x, kpiY, kpiWidth, kpiHeight).fill('#FFFFFF');
            doc.rect(x, kpiY, kpiWidth, kpiHeight).lineWidth(1).stroke(BORDER_COLOR);
            doc.fontSize(7).font('Helvetica').fillColor(TEXT_MUTED).text(k.label.toUpperCase(), x + 8, kpiY + 8);
            doc.fontSize(12).font('Helvetica-Bold').fillColor(k.col).text(k.val, x + 8, kpiY + 22);
          });

          // Trip Logs Table Header
          let tableY = kpiY + 58;
          doc.rect(40, tableY, 515, 20).fill(SECONDARY);
          doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8);
          doc.text('Date', 45, tableY + 6, { width: 55 });
          doc.text('Details of Winch Movement', 105, tableY + 6, { width: 170 });
          doc.text('Distance', 280, tableY + 6, { width: 45, align: 'right' });
          doc.text('Job Carried Out', 335, tableY + 6, { width: 95 });
          doc.text('Eng. Hr', 435, tableY + 6, { width: 40, align: 'right' });
          doc.text('Remarks', 480, tableY + 6, { width: 70 });

          tableY += 20;

          // Trip Rows
          (batch.entries || []).forEach((entry, rowIdx) => {
            if (tableY > 720) {
              doc.addPage();
              tableY = 40;
              // Repeat header on new page
              doc.rect(40, tableY, 515, 20).fill(SECONDARY);
              doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8);
              doc.text('Date', 45, tableY + 6, { width: 55 });
              doc.text('Details of Winch Movement', 105, tableY + 6, { width: 170 });
              doc.text('Distance', 280, tableY + 6, { width: 45, align: 'right' });
              doc.text('Job Carried Out', 335, tableY + 6, { width: 95 });
              doc.text('Eng. Hr', 435, tableY + 6, { width: 40, align: 'right' });
              doc.text('Remarks', 480, tableY + 6, { width: 70 });
              tableY += 20;
            }

            if (rowIdx % 2 === 1) {
              doc.rect(40, tableY, 515, 18).fill(ROW_ALT_BG);
            }
            doc.rect(40, tableY, 515, 18).stroke('#E2E8F0');

            doc.fillColor(SECONDARY).font('Helvetica').fontSize(7.5);
            doc.text(entry.date || '-', 45, tableY + 5, { width: 55, lineBreak: false });
            doc.text(entry.details || '-', 105, tableY + 5, { width: 170, lineBreak: false });
            doc.text(String(entry.distance || 0), 280, tableY + 5, { width: 45, align: 'right' });
            doc.text(entry.job || '-', 335, tableY + 5, { width: 95, lineBreak: false });
            doc.text(String(entry.engineHours || 0), 435, tableY + 5, { width: 40, align: 'right' });
            doc.text(entry.remarks || '-', 480, tableY + 5, { width: 70, lineBreak: false });

            tableY += 18;
          });

          // Calculations Footer Box
          tableY += 10;
          if (tableY > 670) {
            doc.addPage();
            tableY = 50;
          }

          doc.rect(40, tableY, 515, 65).fill('#F8FAFC').stroke(BORDER_COLOR);
          doc.fillColor(PRIMARY).font('Helvetica-Bold').fontSize(8.5);
          doc.text('DIESEL CONSUMPTION BREAKDOWN', 50, tableY + 8);
          
          doc.font('Helvetica').fontSize(8).fillColor(SECONDARY);
          doc.text(`* Total Distance Travelled: ${batch.totalDistance} km @ ${batch.truckAvg} km/L = ${batch.roadConsumption} L (By Road)`, 50, tableY + 22);
          doc.text(`* Total Engine Operation: ${batch.totalEngineHours} hrs @ ${batch.engineAvg} L/hr = ${batch.engineConsumption} L (Job Power Pack)`, 50, tableY + 34);
          doc.font('Helvetica-Bold');
          doc.text(`* Total HSD Consumed: ${batch.totalConsumed} L | Remaining Balance: ${batch.surplusStock} L`, 50, tableY + 48);

          // Reserve Notice
          tableY += 75;
          doc.fillColor(DANGER).font('Helvetica-Oblique').fontSize(7.5);
          doc.text('* NOTE: 30 LITRES DIESEL MUST BE KEPT AS RESERVE STOCK TO PREVENT SYSTEM AIR LOCKING.', 40, tableY);

          // Signatures
          tableY += 25;
          doc.fillColor(SECONDARY).font('Helvetica').fontSize(8);
          doc.text('Prepared By (Driver/Operator)', 40, tableY);
          doc.text('Verified By (Incharge Winch)', 220, tableY);
          doc.text('Authorized Signatory (ONGC)', 400, tableY);
          doc.moveTo(40, tableY + 25).lineTo(150, tableY + 25).stroke('#94A3B8');
          doc.moveTo(220, tableY + 25).lineTo(330, tableY + 25).stroke('#94A3B8');
          doc.moveTo(400, tableY + 25).lineTo(520, tableY + 25).stroke('#94A3B8');
        });
      } else {
        // Consolidated Fleet Report
        drawHeader();

        doc.fontSize(12).font('Helvetica-Bold').fillColor(PRIMARY);
        doc.text('CONSOLIDATED FLEET DIESEL CONSUMPTION REPORT', 40, 110);
        doc.fontSize(8.5).font('Helvetica').fillColor(TEXT_MUTED);
        doc.text('Summary of all reservoir winch vehicles, indents, road/power pack consumption, and balance fuel.', 40, 126);

        // Fleet KPI Cards
        const kpiY = 145;
        const kpiWidth = 98;
        const kpiHeight = 45;

        const kpis = [
          { label: 'Vehicles', val: `${fleetSummary.totalVehicles}`, col: PRIMARY },
          { label: 'Total Issued', val: `${fleetSummary.totalIssued} L`, col: '#0284C7' },
          { label: 'Fleet Distance', val: `${fleetSummary.totalDistance} km`, col: '#4F46E5' },
          { label: 'Total Consumed', val: `${fleetSummary.totalConsumed} L`, col: '#D97706' },
          { label: 'Net Balance', val: `${fleetSummary.fleetBalance} L`, col: fleetSummary.fleetBalance < 30 ? DANGER : SUCCESS }
        ];

        kpis.forEach((k, i) => {
          const x = 40 + i * 104;
          doc.rect(x, kpiY, kpiWidth, kpiHeight).fill('#FFFFFF').stroke(BORDER_COLOR);
          doc.fontSize(7).font('Helvetica').fillColor(TEXT_MUTED).text(k.label.toUpperCase(), x + 6, kpiY + 8);
          doc.fontSize(11).font('Helvetica-Bold').fillColor(k.col).text(k.val, x + 6, kpiY + 22);
        });

        // Fleet Table
        let tableY = 205;
        doc.rect(40, tableY, 515, 22).fill(PRIMARY);
        doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(7.5);
        doc.text('Vehicle Registration', 45, tableY + 7, { width: 95 });
        doc.text('Batches', 145, tableY + 7, { width: 35, align: 'right' });
        doc.text('Issued (L)', 185, tableY + 7, { width: 45, align: 'right' });
        doc.text('Dist (km)', 235, tableY + 7, { width: 45, align: 'right' });
        doc.text('Eng (hr)', 285, tableY + 7, { width: 40, align: 'right' });
        doc.text('Road (L)', 330, tableY + 7, { width: 45, align: 'right' });
        doc.text('Job (L)', 380, tableY + 7, { width: 45, align: 'right' });
        doc.text('Total (L)', 430, tableY + 7, { width: 55, align: 'right' });
        doc.text('Balance (L)', 490, tableY + 7, { width: 60, align: 'right' });

        tableY += 22;

        vehicles.forEach((v, idx) => {
          if (idx % 2 === 1) doc.rect(40, tableY, 515, 20).fill(ROW_ALT_BG);
          doc.rect(40, tableY, 515, 20).stroke('#E2E8F0');

          doc.fillColor(SECONDARY).font('Helvetica-Bold').fontSize(7.5);
          doc.text(v.name, 45, tableY + 6, { width: 95 });

          doc.font('Helvetica');
          doc.text(String(v.totals.batchCount), 145, tableY + 6, { width: 35, align: 'right' });
          doc.text(String(v.totals.totalIssued), 185, tableY + 6, { width: 45, align: 'right' });
          doc.text(String(v.totals.totalDistance), 235, tableY + 6, { width: 45, align: 'right' });
          doc.text(String(v.totals.totalEngineHours), 285, tableY + 6, { width: 40, align: 'right' });
          doc.text(String(v.totals.totalRoadConsumption), 330, tableY + 6, { width: 45, align: 'right' });
          doc.text(String(v.totals.totalEngineConsumption), 380, tableY + 6, { width: 45, align: 'right' });
          doc.text(String(v.totals.totalConsumed), 430, tableY + 6, { width: 55, align: 'right' });

          doc.fillColor(v.totals.currentBalance < 30 ? DANGER : SUCCESS).font('Helvetica-Bold');
          doc.text(String(v.totals.currentBalance), 490, tableY + 6, { width: 60, align: 'right' });

          tableY += 20;
        });

        // Totals row
        doc.rect(40, tableY, 515, 22).fill('#E0F2F1').stroke(BORDER_COLOR);
        doc.fillColor(PRIMARY).font('Helvetica-Bold').fontSize(8);
        doc.text('TOTAL FLEET', 45, tableY + 7, { width: 95 });
        doc.text(String(fleetSummary.totalBatches), 145, tableY + 7, { width: 35, align: 'right' });
        doc.text(String(fleetSummary.totalIssued), 185, tableY + 7, { width: 45, align: 'right' });
        doc.text(String(fleetSummary.totalDistance), 235, tableY + 7, { width: 45, align: 'right' });
        doc.text(String(fleetSummary.totalEngineHours), 285, tableY + 7, { width: 40, align: 'right' });
        doc.text(String(fleetSummary.totalRoadConsumption), 330, tableY + 7, { width: 45, align: 'right' });
        doc.text(String(fleetSummary.totalEngineConsumption), 380, tableY + 7, { width: 45, align: 'right' });
        doc.text(String(fleetSummary.totalConsumed), 430, tableY + 7, { width: 55, align: 'right' });
        doc.text(String(fleetSummary.fleetBalance), 490, tableY + 7, { width: 60, align: 'right' });

        tableY += 35;

        // Reserve Advisory
        doc.fillColor(DANGER).font('Helvetica-Oblique').fontSize(7.5);
        doc.text('* NOTE: 30 LITRES DIESEL MUST BE KEPT AS RESERVE STOCK IN EACH WINCH TANK TO AVOID AIR LOCKING.', 40, tableY);

        // Sign-off
        tableY += 40;
        doc.fillColor(SECONDARY).font('Helvetica').fontSize(8);
        doc.text('Prepared By (Operator)', 40, tableY);
        doc.text('Verified By (Incharge Winch Logistics)', 210, tableY);
        doc.text('Authorized By (General Manager / ONGC)', 380, tableY);
        doc.moveTo(40, tableY + 25).lineTo(150, tableY + 25).stroke('#94A3B8');
        doc.moveTo(210, tableY + 25).lineTo(340, tableY + 25).stroke('#94A3B8');
        doc.moveTo(380, tableY + 25).lineTo(520, tableY + 25).stroke('#94A3B8');
      }

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}
