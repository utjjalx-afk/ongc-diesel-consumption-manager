/**
 * ONGC Reservoir Winch Operations - Overtime (OT) & Field Duty Expenditure (FDE) Calculator
 * Implements exact ONGC Mines Act & PSU calculation rules.
 */

export const NORMAL_DUTY_START = '08:30';
export const NORMAL_DUTY_END = '16:30';
export const FD_SHIFT_HOURS = 8.0;
export const FD_FIXED_RATE = 450; // Rs. 450 per 8-hour shift

/**
 * Calculate OT Rate per hour based on Basic Pay and DA
 * Formula: Math.floor((Basic + DA) / 104)
 * (Standard Mines Act: (Basic + DA) / (26 * 8) * 2 = (Basic + DA) / 104)
 */
export function calculateOtRate(basicPay, da) {
  const b = parseFloat(basicPay) || 0;
  const d = parseFloat(da) || 0;
  if (b + d <= 0) return 0;
  return Math.floor((b + d) / 104);
}

/**
 * Parse time string (e.g. "08:30", "8:30", "18:00", "00:00") into minutes from midnight
 */
export function timeToMinutes(tStr) {
  if (!tStr) throw new Error('Departure and arrival times are required.');
  if (tStr instanceof Date) {
    return tStr.getUTCHours() * 60 + tStr.getUTCMinutes();
  }
  const clean = String(tStr).trim();
  if (!/^([01]?\d|2[0-3]):[0-5]\d$/.test(clean)) throw new Error('Time must be a valid HH:mm value.');
  const parts = clean.split(':');
  if (parts.length < 2) return 0;
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

/**
 * Format minutes from midnight to "HH:mm"
 */
export function minutesToTimeString(mins) {
  const totalMins = ((mins % 1440) + 1440) % 1440;
  const h = Math.floor(totalMins / 60);
  const m = Math.floor(totalMins % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Calculate Duty Hours, FD Shifts, FD Amount, and OT Hours for a given departure & arrival time.
 * 
 * Rules:
 * - Normal duty window: 08:30 to 16:30 (8 hours).
 * - If job completes within 08:30 to 16:30:
 *     Person gets Field Duty (FD) allowance (e.g. 1 shift = Rs. 450), but OT = 0.
 * - Beyond 08:30 (early departure) and after 16:30 (late arrival):
 *     OT is calculated for extra hours.
 * - If continuous shift > 10 hours: 30 minutes rest allowance is applied.
 */
export function calculateDutyAndOt(depTimeStr, arrTimeStr, options = {}) {
  const depMin = timeToMinutes(depTimeStr);
  let arrMin = timeToMinutes(arrTimeStr);

  // Handle shifts crossing midnight (or next day)
  if (arrMin < depMin) {
    arrMin += 1440; // 24 hours in minutes
  }

  const durationMin = arrMin - depMin;
  const dutyHours = Math.round((durationMin / 60) * 100) / 100;
  
  // Field Duty Shifts & Allowance
  const fdShifts = Math.round((dutyHours / FD_SHIFT_HOURS) * 1000) / 1000;
  const fdAmount = Math.round(fdShifts * FD_FIXED_RATE * 100) / 100;

  // Normal duty window in minutes
  const normalStart = 8 * 60 + 30; // 510 (08:30)
  const normalEnd = 16 * 60 + 30;  // 990 (16:30)

  let rawOt = 0;
  let otHours = 0;

  const isHoliday = !!options.isHoliday;

  if (isHoliday) {
    // On holidays/Sundays/off-days, entire duty is compensatory/OT
    otHours = Math.min(8.0, dutyHours);
  } else {
    // Check if completely within normal duty hours
    if (depMin >= normalStart && arrMin <= normalEnd) {
      // Completed within duty hours -> Person gets ONLY FD, NOT OT
      otHours = 0;
    } else {
      let normalMinutes = 0;
      for (let day = 0; day <= Math.floor(arrMin / 1440); day++) {
        normalMinutes += Math.max(0, Math.min(arrMin, day * 1440 + normalEnd)
          - Math.max(depMin, day * 1440 + normalStart));
      }
      rawOt = Math.max(0, durationMin - normalMinutes) / 60;

      // PSU practice: 30 min rest deduction for extended shifts > 10 hours
      if (durationMin > 600 && rawOt >= 0.5) {
        otHours = Math.round((rawOt - 0.5) * 10) / 10;
      } else {
        otHours = Math.round(rawOt * 10) / 10;
      }
    }
  }

  // Allow manual override if provided
  if (options.manualOtHours !== undefined && options.manualOtHours !== null && options.manualOtHours !== '') {
    otHours = Number(options.manualOtHours);
    if (!Number.isFinite(otHours) || otHours < 0 || otHours > dutyHours) throw new Error('Manual OT must be between zero and duty hours.');
  }

  return {
    depTime: minutesToTimeString(depMin),
    arrTime: minutesToTimeString(arrMin % 1440),
    dutyHours,
    fdShifts,
    fdAmount,
    otHours,
    isWithinDutyHours: depMin >= normalStart && arrMin <= normalEnd && !isHoliday
  };
}

/**
 * Allocate field job to selected crew members
 * Validates crew count (4 to 6 members recommended)
 */
export function allocateJobToCrew(jobData, roster) {
  const crewCodes = jobData.crewCodes || [];
  if (!Array.isArray(crewCodes) || new Set(crewCodes).size !== crewCodes.length) throw new Error('Crew members must be unique.');
  if (crewCodes.some(code => !Object.hasOwn(roster, code) || roster[code].status === 'retired')) throw new Error('Select active crew members from the roster.');
  const calculations = calculateDutyAndOt(jobData.depTime, jobData.arrTime, {
    isHoliday: jobData.isHoliday,
    manualOtHours: jobData.manualOtHours
  });

  const memberAllocations = [];
  let totalOtPayout = 0;
  let totalFdPayout = 0;

  for (const code of crewCodes) {
    const emp = roster[code] || {
      code,
      name: code,
      cpf: '',
      otRate: 400,
      fdRate: FD_FIXED_RATE
    };

    const savedRate = jobData.memberAllocations?.find(a => a.employeeCode === code)?.otRate;
    const otRate = savedRate ?? emp.otRate;
    const otAmount = Math.round(calculations.otHours * otRate * 100) / 100;
    const fdAmount = calculations.fdAmount;

    totalOtPayout += otAmount;
    totalFdPayout += fdAmount;

    memberAllocations.push({
      employeeCode: code,
      employeeName: emp.name,
      cpf: emp.cpf,
      designation: emp.designation,
      otRate,
      otHours: calculations.otHours,
      otAmount,
      dutyHours: calculations.dutyHours,
      fdShifts: calculations.fdShifts,
      fdAmount
    });
  }

  return {
    ...jobData,
    ...calculations,
    crewCount: crewCodes.length,
    isCrewCountValid: crewCodes.length >= 4 && crewCodes.length <= 10,
    memberAllocations,
    totalOtPayout: Math.round(totalOtPayout * 100) / 100,
    totalFdPayout: Math.round(totalFdPayout * 100) / 100
  };
}

/**
 * Normalize and parse various job date formats (YYYY-MM-DD, DD.MM.YYYY, DD/MM/YYYY)
 */
export function normalizeJobDate(dateStr) {
  if (!dateStr) return { year: '2025', month: '2025-01', monthNum: 1, day: '01' };
  const str = String(dateStr).trim();
  // Format YYYY-MM-DD
  if (/^\d{4}-\d{2}/.test(str)) {
    const parts = str.split('-');
    const mNum = parseInt(parts[1], 10) || 1;
    return {
      year: parts[0],
      month: `${parts[0]}-${String(mNum).padStart(2, '0')}`,
      monthNum: mNum,
      day: parts[2] || '01'
    };
  }
  // Format DD.MM.YYYY
  if (/^\d{1,2}\.\d{1,2}\.\d{4}/.test(str)) {
    const parts = str.split('.');
    const mNum = parseInt(parts[1], 10) || 1;
    return {
      year: parts[2],
      month: `${parts[2]}-${String(mNum).padStart(2, '0')}`,
      monthNum: mNum,
      day: String(parts[0]).padStart(2, '0')
    };
  }
  // Format DD/MM/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(str)) {
    const parts = str.split('/');
    const mNum = parseInt(parts[1], 10) || 1;
    return {
      year: parts[2],
      month: `${parts[2]}-${String(mNum).padStart(2, '0')}`,
      monthNum: mNum,
      day: String(parts[0]).padStart(2, '0')
    };
  }
  const yearMatch = str.match(/\b(20\d{2})\b/);
  const year = yearMatch ? yearMatch[1] : '2025';
  return { year, month: `${year}-01`, monthNum: 1, day: '01' };
}

/**
 * Generate monthly OT & FDE statement summaries for a given month and employee
 */
export function generateMonthlyStatements(jobs, roster, targetMonth) {
  // targetMonth: 'YYYY-MM' e.g. '2025-01'
  const otStatementsByEmployee = {};
  const fdeStatementsByEmployee = {};

  // Initialize for all employees in roster
  for (const code of Object.keys(roster)) {
    const emp = roster[code];
    otStatementsByEmployee[code] = {
      employee: emp,
      month: targetMonth,
      claimType: 'OVERTIME CLAIM',
      formNumber: 'CLM-MIS-02',
      entries: [],
      totalOtHours: 0,
      totalOtAmount: 0
    };

    fdeStatementsByEmployee[code] = {
      employee: emp,
      month: targetMonth,
      claimType: 'FIELD DUTY EXPENDITURE',
      formNumber: 'CLM-MIS-02',
      entries: [],
      totalFieldHours: 0,
      totalShifts: 0,
      totalFdAmount: 0
    };
  }

  // Filter jobs by month using normalized date
  for (const job of jobs) {
    const parsed = normalizeJobDate(job.date);
    if (parsed.month !== targetMonth) continue;

    const crew = job.crewCodes || [];
    for (const code of crew) {
      if (!roster[code]) continue;
      const emp = roster[code];
      const allocation = job.memberAllocations?.find(a => a.employeeCode === code);
      const rate = allocation?.otRate ?? emp.otRate;
      const otAmt = allocation?.otAmount ?? Math.round((job.otHours || 0) * rate * 100) / 100;
      const fdAmt = job.fdAmount || 0;

      // Add to OT statement
      otStatementsByEmployee[code].entries.push({
        jobId: job.id,
        date: job.date,
        depTime: job.depTime,
        arrTime: job.arrTime,
        dutyHours: job.dutyHours,
        otHours: job.otHours,
        otRate: rate,
        otAmount: otAmt,
        location: job.location,
        vehicle: job.vehicle,
        remarks: job.remarks
      });
      otStatementsByEmployee[code].totalOtHours += (job.otHours || 0);
      otStatementsByEmployee[code].totalOtAmount += otAmt;

      // Add to FDE statement
      fdeStatementsByEmployee[code].entries.push({
        jobId: job.id,
        date: job.date,
        depTime: job.depTime,
        arrTime: job.arrTime,
        dutyHours: job.dutyHours,
        fdShifts: job.fdShifts,
        fdAmount: fdAmt,
        location: job.location,
        vehicle: job.vehicle,
        remarks: job.remarks
      });
      fdeStatementsByEmployee[code].totalFieldHours += (job.dutyHours || 0);
      fdeStatementsByEmployee[code].totalShifts += (job.fdShifts || 0);
      fdeStatementsByEmployee[code].totalFdAmount += fdAmt;
    }
  }

  // Round summary figures
  for (const code of Object.keys(roster)) {
    otStatementsByEmployee[code].totalOtHours = Math.round(otStatementsByEmployee[code].totalOtHours * 10) / 10;
    otStatementsByEmployee[code].totalOtAmount = Math.round(otStatementsByEmployee[code].totalOtAmount * 100) / 100;
    otStatementsByEmployee[code].dutyDays = otStatementsByEmployee[code].entries.length;

    fdeStatementsByEmployee[code].totalFieldHours = Math.round(fdeStatementsByEmployee[code].totalFieldHours * 10) / 10;
    fdeStatementsByEmployee[code].totalShifts = Math.round(fdeStatementsByEmployee[code].totalShifts * 1000) / 1000;
    fdeStatementsByEmployee[code].totalFdAmount = Math.round(fdeStatementsByEmployee[code].totalFdAmount * 100) / 100;
    fdeStatementsByEmployee[code].dutyDays = fdeStatementsByEmployee[code].entries.length;
  }

  return {
    month: targetMonth,
    ot: otStatementsByEmployee,
    fde: fdeStatementsByEmployee
  };
}

/**
 * Generate Year-wise Overtime and FDE summary across 12 months & all crew
 */
export function generateYearlyStatements(jobs, roster, targetYear = '2025') {
  // Collect all distinct years from jobs
  const yearsSet = new Set();
  for (const job of jobs) {
    const parsed = normalizeJobDate(job.date);
    if (parsed.year && parsed.year.length === 4) {
      yearsSet.add(parsed.year);
    }
  }
  yearsSet.add('2025');
  yearsSet.add('2024');
  const availableYears = Array.from(yearsSet).sort().reverse();

  const selectedYear = String(targetYear).toUpperCase() === 'ALL' ? 'ALL' : String(targetYear);

  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Initialize 12 months data
  const monthsData = [];
  for (let m = 1; m <= 12; m++) {
    const mPad = String(m).padStart(2, '0');
    const mKey = selectedYear !== 'ALL' ? `${selectedYear}-${mPad}` : `M-${mPad}`;
    monthsData.push({
      monthNum: m,
      monthKey: mKey,
      monthName: MONTH_NAMES[m - 1],
      totalTrips: 0,
      totalFieldHours: 0,
      totalOtHours: 0,
      totalOtAmount: 0,
      totalFdShifts: 0,
      totalFdAmount: 0,
      crewParticipated: new Set()
    });
  }

  // Initialize employee yearly accumulators
  const employeesData = {};
  for (const code of Object.keys(roster)) {
    const emp = roster[code];
    employeesData[code] = {
      code,
      name: emp.name,
      cpf: emp.cpf,
      designation: emp.designation,
      otRate: emp.otRate,
      basicPay: emp.basicPay,
      da: emp.da,
      totalTrips: 0,
      totalFieldHours: 0,
      totalOtHours: 0,
      totalOtAmount: 0,
      totalFdShifts: 0,
      totalFdAmount: 0,
      months: {}
    };
    for (let m = 1; m <= 12; m++) {
      const mPad = String(m).padStart(2, '0');
      const mKey = selectedYear !== 'ALL' ? `${selectedYear}-${mPad}` : `M-${mPad}`;
      employeesData[code].months[mKey] = {
        monthKey: mKey,
        monthName: MONTH_NAMES[m - 1],
        trips: 0,
        fieldHours: 0,
        otHours: 0,
        otAmount: 0,
        fdShifts: 0,
        fdAmount: 0
      };
    }
  }

  let totalFleetJobs = 0;
  let totalFleetFieldHours = 0;
  let totalFleetOtHours = 0;
  let totalFleetOtAmount = 0;
  let totalFleetFdAmount = 0;

  for (const job of jobs) {
    const parsed = normalizeJobDate(job.date);
    if (selectedYear !== 'ALL' && parsed.year !== selectedYear) {
      continue;
    }

    totalFleetJobs++;
    totalFleetFieldHours += (job.dutyHours || 0);

    const mIdx = Math.max(0, Math.min(11, parsed.monthNum - 1));
    const mObj = monthsData[mIdx];
    mObj.totalTrips++;
    mObj.totalFieldHours += (job.dutyHours || 0);
    mObj.totalOtHours += (job.otHours || 0);
    mObj.totalFdShifts += (job.fdShifts || 0);

    const crew = job.crewCodes || [];
    for (const code of crew) {
      if (!roster[code]) continue;
      mObj.crewParticipated.add(code);
      const emp = roster[code];
      const allocation = job.memberAllocations?.find(a => a.employeeCode === code);
      const rate = allocation?.otRate ?? emp.otRate;
      const otAmt = allocation?.otAmount ?? Math.round((job.otHours || 0) * rate * 100) / 100;
      const fdAmt = job.fdAmount || 0;

      mObj.totalOtAmount += otAmt;
      mObj.totalFdAmount += fdAmt;
      totalFleetOtAmount += otAmt;
      totalFleetFdAmount += fdAmt;
      totalFleetOtHours += (job.otHours || 0);

      const empObj = employeesData[code];
      empObj.totalTrips++;
      empObj.totalFieldHours += (job.dutyHours || 0);
      empObj.totalOtHours += (job.otHours || 0);
      empObj.totalOtAmount += otAmt;
      empObj.totalFdShifts += (job.fdShifts || 0);
      empObj.totalFdAmount += fdAmt;

      const empMonth = empObj.months[mObj.monthKey];
      if (empMonth) {
        empMonth.trips++;
        empMonth.fieldHours += (job.dutyHours || 0);
        empMonth.otHours += (job.otHours || 0);
        empMonth.otAmount += otAmt;
        empMonth.fdShifts += (job.fdShifts || 0);
        empMonth.fdAmount += fdAmt;
      }
    }
  }

  // Convert crewParticipated Set to count and round
  for (const mObj of monthsData) {
    mObj.activeCrewCount = mObj.crewParticipated.size;
    delete mObj.crewParticipated;
    mObj.totalFieldHours = Math.round(mObj.totalFieldHours * 10) / 10;
    mObj.totalOtHours = Math.round(mObj.totalOtHours * 10) / 10;
    mObj.totalOtAmount = Math.round(mObj.totalOtAmount * 100) / 100;
    mObj.totalFdAmount = Math.round(mObj.totalFdAmount * 100) / 100;
    mObj.combinedAmount = Math.round((mObj.totalOtAmount + mObj.totalFdAmount) * 100) / 100;
  }

  // Find peak OT month
  let peakOtMonth = null;
  let maxOt = -1;
  for (const mObj of monthsData) {
    if (mObj.totalOtHours > maxOt && mObj.totalOtHours > 0) {
      maxOt = mObj.totalOtHours;
      peakOtMonth = `${mObj.monthName} (${mObj.totalOtHours.toFixed(1)} hrs)`;
    }
  }

  // Sort employees by highest OT amount
  const employeeList = Object.values(employeesData).map(e => {
    e.totalFieldHours = Math.round(e.totalFieldHours * 10) / 10;
    e.totalOtHours = Math.round(e.totalOtHours * 10) / 10;
    e.totalOtAmount = Math.round(e.totalOtAmount * 100) / 100;
    e.totalFdAmount = Math.round(e.totalFdAmount * 100) / 100;
    e.combinedAmount = Math.round((e.totalOtAmount + e.totalFdAmount) * 100) / 100;
    return e;
  }).sort((a, b) => b.totalOtAmount - a.totalOtAmount);

  return {
    year: selectedYear,
    availableYears,
    summary: {
      totalJobs: totalFleetJobs,
      totalFieldHours: Math.round(totalFleetFieldHours * 10) / 10,
      totalOtHours: Math.round(totalFleetOtHours * 10) / 10,
      totalOtAmount: Math.round(totalFleetOtAmount * 100) / 100,
      totalFdAmount: Math.round(totalFleetFdAmount * 100) / 100,
      totalCombinedAmount: Math.round((totalFleetOtAmount + totalFleetFdAmount) * 100) / 100,
      peakOtMonth: peakOtMonth || 'None',
      totalCrewCount: Object.keys(roster).length
    },
    months: monthsData,
    employees: employeeList
  };
}
