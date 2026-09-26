/**
 * Fuel calculation logic for ONGC vehicle winch logbook
 */

export function calculateBatchMetrics(batch) {
  const entries = batch.entries || [];
  
  // Calculate total distance & total engine hours from entries
  const totalDistance = entries.reduce((sum, entry) => {
    const d = parseFloat(entry.distance);
    return sum + (isNaN(d) ? 0 : d);
  }, 0);

  const totalEngineHours = entries.reduce((sum, entry) => {
    const h = parseFloat(entry.engineHours);
    return sum + (isNaN(h) ? 0 : h);
  }, 0);

  const truckAvg = parseFloat(batch.truckAvg) > 0 ? parseFloat(batch.truckAvg) : 3.0; // default 3 km/l
  const engineAvg = parseFloat(batch.engineAvg) > 0 ? parseFloat(batch.engineAvg) : 4.0; // default 4 l/hr
  const issuedQty = parseFloat(batch.issuedQty) || 0;

  // Road consumption = Distance / (km/l)
  const roadConsumption = truckAvg > 0 ? totalDistance / truckAvg : 0;

  // Engine run consumption = Engine Hours * (l/hr)
  const engineConsumption = totalEngineHours * engineAvg;

  // Total HSD consumed
  const totalConsumed = roadConsumption + engineConsumption;

  // Surplus stock (or balance remaining)
  const surplusStock = issuedQty - totalConsumed;

  // Reserve alert if balance falls below 30 L (ONGC air-locking safety margin)
  const isReserveWarning = surplusStock <= 30;

  return {
    ...batch,
    totalDistance: Math.round(totalDistance * 100) / 100,
    totalEngineHours: Math.round(totalEngineHours * 100) / 100,
    truckAvg,
    engineAvg,
    issuedQty,
    roadConsumption: Math.round(roadConsumption * 100) / 100,
    engineConsumption: Math.round(engineConsumption * 100) / 100,
    totalConsumed: Math.round(totalConsumed * 100) / 100,
    surplusStock: Math.round(surplusStock * 100) / 100,
    isReserveWarning
  };
}

export function calculateVehicleTotals(vehicle) {
  const batches = (vehicle.batches || []).map(calculateBatchMetrics);

  const totalIssued = batches.reduce((sum, b) => sum + (b.issuedQty || 0), 0);
  const totalDistance = batches.reduce((sum, b) => sum + (b.totalDistance || 0), 0);
  const totalEngineHours = batches.reduce((sum, b) => sum + (b.totalEngineHours || 0), 0);
  const totalRoadConsumption = batches.reduce((sum, b) => sum + (b.roadConsumption || 0), 0);
  const totalEngineConsumption = batches.reduce((sum, b) => sum + (b.engineConsumption || 0), 0);
  const totalConsumed = batches.reduce((sum, b) => sum + (b.totalConsumed || 0), 0);
  const currentBalance = batches.length > 0 ? batches[batches.length - 1].surplusStock : 0;
  const totalTrips = batches.reduce((sum, b) => sum + (b.entries ? b.entries.length : 0), 0);

  return {
    ...vehicle,
    batches,
    totals: {
      totalIssued: Math.round(totalIssued * 100) / 100,
      totalDistance: Math.round(totalDistance * 100) / 100,
      totalEngineHours: Math.round(totalEngineHours * 100) / 100,
      totalRoadConsumption: Math.round(totalRoadConsumption * 100) / 100,
      totalEngineConsumption: Math.round(totalEngineConsumption * 100) / 100,
      totalConsumed: Math.round(totalConsumed * 100) / 100,
      currentBalance: Math.round(currentBalance * 100) / 100,
      totalTrips,
      batchCount: batches.length
    }
  };
}

export function calculateFleetSummary(vehicles) {
  const calculatedVehicles = vehicles.map(calculateVehicleTotals);

  const summary = calculatedVehicles.reduce((acc, v) => {
    acc.totalVehicles += 1;
    acc.totalIssued += v.totals.totalIssued;
    acc.totalDistance += v.totals.totalDistance;
    acc.totalEngineHours += v.totals.totalEngineHours;
    acc.totalRoadConsumption += v.totals.totalRoadConsumption;
    acc.totalEngineConsumption += v.totals.totalEngineConsumption;
    acc.totalConsumed += v.totals.totalConsumed;
    acc.totalTrips += v.totals.totalTrips;
    acc.totalBatches += v.totals.batchCount;
    return acc;
  }, {
    totalVehicles: 0,
    totalIssued: 0,
    totalDistance: 0,
    totalEngineHours: 0,
    totalRoadConsumption: 0,
    totalEngineConsumption: 0,
    totalConsumed: 0,
    totalTrips: 0,
    totalBatches: 0
  });

  // Round summary numbers
  for (const key of Object.keys(summary)) {
    if (typeof summary[key] === 'number') {
      summary[key] = Math.round(summary[key] * 100) / 100;
    }
  }

  summary.fleetBalance = Math.round((summary.totalIssued - summary.totalConsumed) * 100) / 100;

  return {
    vehicles: calculatedVehicles,
    fleetSummary: summary
  };
}
