import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import net from 'node:net';

test('API protects admin actions, restores operational changes, and exports the selected crew', async () => {
  const dataDir = mkdtempSync(path.join(path.resolve('.'), '.ongc-test-'));
  const users = ['admin', 'crew'].map(userId => ({ userId, password: 'TestPass123', name: userId,
    status: 'active', isAdmin: userId === 'admin' }));
  writeFileSync(path.join(dataDir, 'users_db.json'), JSON.stringify({ users, auditLog: [] }));
  writeFileSync(path.join(dataDir, 'ot_fde_store.json'), JSON.stringify({ roster: {
    A: { code: 'A', name: 'ALPHA TEST', otRate: 100, basicPay: 10400, da: 0, status: 'active' },
    B: { code: 'B', name: 'BRAVO TEST', otRate: 200, basicPay: 20800, da: 0, status: 'active' }
  }, jobs: [] }));
  writeFileSync(path.join(dataDir, 'operations_store.json'), JSON.stringify({
    activeData: { vehicles: [{ id: 'V1', name: 'Test vehicle', batches: [{ id: 'B1', issuedQty: 100, entries: [] }] }], dieselIssuedRecords: [] },
    wellSiteData: { fields: [], clusters: [], wells: [] },
    maintenanceData: { vehicles: [], maintenanceRecords: [], summary: { totalMaintenanceServices: 0 } }
  }));
  const portServer = net.createServer();
  portServer.listen(0, '127.0.0.1');
  await once(portServer, 'listening');
  const port = portServer.address().port;
  await new Promise(resolve => portServer.close(resolve));
  const base = `http://127.0.0.1:${port}`;
  let child;
  async function start() {
    child = spawn(process.execPath, ['server.js'], { cwd: path.resolve('.'),
      env: { ...process.env, PORT: String(port), ONGC_DATA_DIR: dataDir }, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', data => { output += data; });
    child.stderr.on('data', data => { output += data; });
    for (let i = 0; i < 600; i++) {
      if (child.exitCode !== null) throw new Error(output);
      try { if ((await fetch(`${base}/api/auth/me`)).status === 401) return; } catch {}
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    throw new Error(`Server did not start: ${output}`);
  }
  async function stop() {
    if (child && child.exitCode === null) { const done = once(child, 'exit'); child.kill(); await done; }
  }
  const request = (url, method = 'GET', body, cookie) => fetch(base + url, { method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}) });
  async function login(userId) {
    const response = await request('/api/auth/login', 'POST', { userId, password: 'TestPass123' });
    assert.equal(response.status, 200);
    assert.match(response.headers.get('set-cookie'), /HttpOnly/);
    return response.headers.get('set-cookie').split(';')[0];
  }
  try {
    await start();
    assert.equal((await request('/api/data')).status, 401);
    assert.equal((await request('/api/auth/users')).status, 401);
    const wrongCase = await request('/api/auth/login', 'POST', { userId: 'admin', password: 'testpass123' });
    assert.equal(wrongCase.status, 401);
    const crewCookie = await login('crew');
    assert.equal((await request('/api/auth/users', 'GET', undefined, crewCookie)).status, 403);
    assert.equal((await request('/api/ot-fde/roster/batch-da', 'POST', { daAmount: 1 }, crewCookie)).status, 403);
    const cookie = await login('admin');
    const crossSite = await fetch(base + '/api/entry', { method: 'POST', headers: {
      'Content-Type': 'application/json', Origin: 'https://example.com', Cookie: cookie
    }, body: '{}' });
    assert.equal(crossSite.status, 403);
    const preview = await (await request('/api/ot-fde/preview', 'POST', { depTime: '06:00', arrTime: '07:00', crewCodes: ['A'] }, cookie)).json();
    assert.equal(preview.preview.otHours, 1);
    assert.equal(preview.preview.crewDetails[0].basicPay, 10400);
    assert.equal((await request('/api/entry', 'POST', { vehicleId: 'V1', batchId: 'B1', distance: 9, engineHours: 1 }, cookie)).status, 200);
    assert.equal((await request('/api/maintenance/record', 'POST', { vehicleId: 'V1', description: 'Test service' }, cookie)).status, 200);
    assert.equal((await request('/api/well-sites/cluster', 'POST', { field: 'Test', clusterName: 'Test cluster', wells: ['TEST-1'] }, cookie)).status, 200);
    const exportResponse = await request('/api/ot-fde/export/excel?empCode=B&month=2025-01', 'GET', undefined, cookie);
    assert.equal(exportResponse.status, 200);
    assert.match(exportResponse.headers.get('content-disposition'), /BRAVO_TEST/);
    const pdfResponse = await request('/api/ot-fde/export/pdf?empCode=B&month=2025-01', 'GET', undefined, cookie);
    assert.equal(pdfResponse.status, 200);
    assert.match(pdfResponse.headers.get('content-disposition'), /BRAVO_TEST/);
    assert.equal(Buffer.from(await pdfResponse.arrayBuffer()).subarray(0, 5).toString(), '%PDF-');
    const migrated = JSON.parse(readFileSync(path.join(dataDir, 'users_db.json'), 'utf8'));
    assert.equal(migrated.users[0].password, undefined);
    assert.match(migrated.users[0].passwordHash, /^scrypt:/);
    await stop();
    await start();
    const renewed = await login('admin');
    const fleet = await (await request('/api/data', 'GET', undefined, renewed)).json();
    assert.equal(fleet.vehicles[0].batches[0].entries.length, 1);
    const maintenance = await (await request('/api/maintenance', 'GET', undefined, renewed)).json();
    assert.equal(maintenance.maintenanceRecords.length, 1);
    const sites = await (await request('/api/well-sites', 'GET', undefined, renewed)).json();
    assert.equal(sites.clusters[0].clusterName, 'TEST CLUSTER');
    const ot = await (await request('/api/ot-fde/data', 'GET', undefined, renewed)).json();
    assert.equal(ot.jobs.length, 0);
    await request('/api/auth/logout', 'POST', {}, renewed);
    assert.equal((await request('/api/data', 'GET', undefined, renewed)).status, 401);
    assert.equal((await request('/api/maintenance', 'GET')).status, 200);
  } finally {
    await stop();
    assert(dataDir.startsWith(path.join(path.resolve('.'), '.ongc-test-')));
    rmSync(dataDir, { recursive: true, force: true });
  }
});
