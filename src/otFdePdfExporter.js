import PDFDocument from 'pdfkit';

/**
 * Generate official Form No. CLM-MIS-02 PDF statement for ONGC Overtime or Field Duty
 * @param {Object} statement - Employee statement object
 * @param {'ot'|'fde'} type - Statement type
 */
export function generateClaimPdf(statement, type = 'ot') {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 36,
        bufferPages: true
      });

      const buffers = [];
      doc.on('data', b => buffers.push(b));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', err => reject(err));

      const isOt = type.toLowerCase() === 'ot';
      const employee = statement.employee || {};
      const entries = statement.entries || [];
      const title = isOt ? 'OVERTIME CLAIM' : 'FIELD DUTY EXPENDITURE CLAIM';

      // Colors
      const PRIMARY_DARK = '#0B2545';
      const ONGC_RED = '#991B1B';
      const TEXT_MAIN = '#111827';
      const TEXT_MUTED = '#4B5563';
      const BORDER_COLOR = '#9CA3AF';
      const HEADER_BG = '#F3F4F6';
      const ALT_ROW_BG = '#F9FAFB';

      // 1. Top Form Label & Title
      doc.font('Helvetica').fontSize(8).fillColor(TEXT_MUTED);
      doc.text('Form No. CLM-MIS-02', 40, 30, { align: 'right', width: 515 });

      doc.font('Helvetica-Bold').fontSize(13).fillColor(PRIMARY_DARK);
      doc.text('OIL AND NATURAL GAS CORPORATION LTD', 40, 44, { align: 'center', width: 515 });
      
      doc.font('Helvetica').fontSize(9).fillColor(TEXT_MUTED);
      doc.text('Assam Asset • Reservoir Winch Logistics / Surface Support Team (SST)', 40, 59, { align: 'center', width: 515 });

      doc.moveDown(0.3);
      doc.font('Helvetica-Bold').fontSize(11).fillColor(ONGC_RED);
      doc.text(title, 40, 72, { align: 'center', width: 515, underline: true });

      // 2. Employee Metadata Box
      const boxY = 92;
      const boxH = 75;
      doc.rect(40, boxY, 515, boxH).fillAndStroke('#FFFFFF', BORDER_COLOR);

      // Metadata layout inside box
      const col1 = 50;
      const col2 = 180;
      const col3 = 310;
      const col4 = 430;

      // Row 1
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(TEXT_MAIN);
      doc.text('CPF No.:', col1, boxY + 8);
      doc.font('Helvetica').text(employee.cpf || '140751', col1 + 55, boxY + 8);

      doc.font('Helvetica-Bold').text('Name:', col3, boxY + 8);
      doc.font('Helvetica-Bold').text(employee.name || 'UTJJAL CHETIA', col3 + 40, boxY + 8);

      // Row 2
      doc.font('Helvetica-Bold').text('Designation:', col1, boxY + 22);
      doc.font('Helvetica').text(employee.designation || 'JMVD(W.O.)', col1 + 65, boxY + 22);

      doc.font('Helvetica-Bold').text('Section/Site:', col3, boxY + 22);
      doc.font('Helvetica').text(employee.section || 'SST', col3 + 65, boxY + 22);

      // Row 3
      doc.font('Helvetica-Bold').text('Org. Unit:', col1, boxY + 36);
      doc.font('Helvetica').text(employee.orgUnit || 'ONGCL', col1 + 55, boxY + 36);

      doc.font('Helvetica-Bold').text('Location:', col3, boxY + 36);
      doc.font('Helvetica').text(employee.location || 'JORHAT', col3 + 50, boxY + 36);

      // Row 4
      doc.font('Helvetica-Bold').text('Bill No.:', col1, boxY + 50);
      doc.font('Helvetica').text(employee.billNo || '473', col1 + 45, boxY + 50);

      doc.font('Helvetica-Bold').text('Basic Pay (Rs.):', col2 - 20, boxY + 50);
      doc.font('Helvetica').text(String(employee.basicPay || '28230'), col2 + 55, boxY + 50);

      doc.font('Helvetica-Bold').text('DA (Rs.):', col4 - 30, boxY + 50);
      doc.font('Helvetica').text(String(employee.da || '14002'), col4 + 20, boxY + 50);

      // Row 5
      const rateLabel = isOt ? 'Rate/Hrs. (Rs.):' : 'Rate/shift. (Rs.):';
      const rateVal = isOt ? String(employee.otRate || '406') : '450';
      doc.font('Helvetica-Bold').text(rateLabel, col1, boxY + 62);
      doc.font('Helvetica-Bold').fillColor(ONGC_RED).text(rateVal, col1 + 80, boxY + 62);

      doc.fillColor(TEXT_MAIN).font('Helvetica-Bold').text('Month:', col3, boxY + 62);
      doc.font('Helvetica').text(formatMonthString(statement.month), col3 + 40, boxY + 62);

      // 3. Claims Duty Table
      let tableY = boxY + boxH + 12;
      const headers = isOt
        ? ['Date', 'Dep. Time', 'Arr. Time', 'Total Hrs.', 'OT (Hrs)', 'Remarks / Well Site Work Details']
        : ['Date', 'Dep. Time', 'Arr. Time', 'Duty in Field(hrs)', 'Location', 'Remarks / Well Site Work Details'];

      const colWidths = isOt
        ? [65, 50, 50, 55, 45, 250]
        : [65, 50, 50, 75, 75, 200];

      // Draw table header
      doc.rect(40, tableY, 515, 20).fillAndStroke(HEADER_BG, BORDER_COLOR);
      doc.font('Helvetica-Bold').fontSize(8).fillColor(PRIMARY_DARK);

      let curX = 40;
      headers.forEach((h, idx) => {
        const align = (idx === 3 || idx === 4) ? 'center' : (idx >= 5 ? 'left' : 'center');
        doc.text(h, curX + 2, tableY + 6, { width: colWidths[idx] - 4, align });
        curX += colWidths[idx];
      });

      tableY += 20;

      // Draw rows
      let totalHours = 0;
      let totalOtOrShift = 0;
      let totalAmount = 0;

      entries.forEach((entry, idx) => {
        // Page overflow check
        if (tableY > 700) {
          doc.addPage();
          tableY = 40;
          // redraw header
          doc.rect(40, tableY, 515, 20).fillAndStroke(HEADER_BG, BORDER_COLOR);
          doc.font('Helvetica-Bold').fontSize(8).fillColor(PRIMARY_DARK);
          let cx = 40;
          headers.forEach((h, i) => {
            const align = (i === 3 || i === 4) ? 'center' : (i >= 5 ? 'left' : 'center');
            doc.text(h, cx + 2, tableY + 6, { width: colWidths[i] - 4, align });
            cx += colWidths[i];
          });
          tableY += 20;
        }

        const isAlt = idx % 2 === 1;
        const rowH = 18;
        if (isAlt) {
          doc.rect(40, tableY, 515, rowH).fill(ALT_ROW_BG);
        }
        doc.rect(40, tableY, 515, rowH).stroke('#E5E7EB');

        doc.font('Helvetica').fontSize(7.5).fillColor(TEXT_MAIN);

        // Date
        curX = 40;
        doc.text(formatDateDisplay(entry.date), curX + 2, tableY + 5, { width: colWidths[0] - 4, align: 'center' });
        curX += colWidths[0];

        // Dep Time
        doc.text(entry.depTime || '08:30', curX + 2, tableY + 5, { width: colWidths[1] - 4, align: 'center' });
        curX += colWidths[1];

        // Arr Time
        doc.text(entry.arrTime || '17:30', curX + 2, tableY + 5, { width: colWidths[2] - 4, align: 'center' });
        curX += colWidths[2];

        // Total Hrs / Duty in field
        const dutyH = Number(entry.dutyHours || 0).toFixed(1);
        doc.text(dutyH, curX + 2, tableY + 5, { width: colWidths[3] - 4, align: 'center' });
        curX += colWidths[3];

        if (isOt) {
          // OT Hours
          const otH = Number(entry.otHours || 0).toFixed(1);
          doc.font('Helvetica-Bold').text(otH, curX + 2, tableY + 5, { width: colWidths[4] - 4, align: 'center' });
          curX += colWidths[4];

          // Remarks
          doc.font('Helvetica').text(cleanRemarks(entry.remarks), curX + 4, tableY + 5, { width: colWidths[5] - 8, lineBreak: false });
        } else {
          // Location
          doc.text(entry.location || 'BORHOLLA', curX + 2, tableY + 5, { width: colWidths[4] - 4, align: 'center' });
          curX += colWidths[4];

          // Remarks
          doc.text(cleanRemarks(entry.remarks), curX + 4, tableY + 5, { width: colWidths[5] - 8, lineBreak: false });
        }

        tableY += rowH;
      });

      // 4. Totals Row
      doc.rect(40, tableY, 515, 24).fillAndStroke('#EFF6FF', BORDER_COLOR);
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(PRIMARY_DARK);

      if (isOt) {
        const totOtHrs = Number(statement.totalOtHours || 0).toFixed(1);
        const totRs = Number(statement.totalOtAmount || 0).toFixed(2);
        
        doc.text(`Total OT Hrs.:  ${totOtHrs} hrs`, 50, tableY + 7);
        doc.text(`Rate: Rs. ${employee.otRate || 406}/hr`, 230, tableY + 7);
        doc.fillColor(ONGC_RED).text(`Total Claimed: Rs. ${totRs}`, 380, tableY + 7);
      } else {
        const totFieldHrs = Number(statement.totalFieldHours || 0).toFixed(1);
        const totShifts = Number(statement.totalShifts || 0).toFixed(3);
        const totRs = Number(statement.totalFdAmount || 0).toFixed(2);

        doc.text(`Total Hrs.: ${totFieldHrs}`, 50, tableY + 7);
        doc.text(`Total Shifts: ${totShifts} (@ Rs. 450/shift)`, 170, tableY + 7);
        doc.fillColor(ONGC_RED).text(`Total Claimed: Rs. ${totRs}`, 380, tableY + 7);
      }

      tableY += 34;

      // 5. Official Certifications (as per Form CLM-MIS-02)
      doc.font('Helvetica').fontSize(7.5).fillColor(TEXT_MUTED);
      if (isOt) {
        doc.text('* Certified that he was requested to work for OT, which could not be postponed.', 40, tableY);
        doc.text('* Certified that the OT has been sanctioned by the Competent Authority.', 40, tableY + 11);
        doc.text('* Certified that he did not receive any other remuneration/compensatory off for performance of OT.', 40, tableY + 22);
        doc.text('* Certified that the claim is in order as per Mines Act / Company Rules.', 40, tableY + 33);
        tableY += 50;
      } else {
        doc.text('* Certified that the officer/staff performed field duty at designated ONGC well sites.', 40, tableY);
        doc.text('* Certified that Field Duty Expenditure is claimed as per approved asset rates (Rs. 450 per 8-hr shift).', 40, tableY + 11);
        doc.text('* Certified that no overlapping claims or local conveyance were availed during field duty.', 40, tableY + 22);
        tableY += 38;
      }

      // 6. Signatures Block
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(TEXT_MAIN);
      doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, 40, tableY);

      doc.text('(Signature of Employee)', 160, tableY, { width: 140, align: 'center' });
      doc.text('(Signature of Controlling Officer)', 380, tableY, { width: 160, align: 'center' });

      // End document
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

function formatMonthString(mStr) {
  if (!mStr) return 'January 2025';
  const parts = String(mStr).split('-');
  if (parts.length === 2) {
    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${months[monthIndex] || parts[1]} ${year}`;
  }
  return mStr;
}

function formatDateDisplay(dStr) {
  if (!dStr) return '';
  const parts = String(dStr).split('-');
  if (parts.length === 3) {
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  }
  return dStr;
}

function cleanRemarks(rem) {
  if (!rem) return '';
  return String(rem).replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
}
