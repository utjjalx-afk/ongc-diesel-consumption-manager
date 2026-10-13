import fs from 'node:fs';
import path from 'node:path';
import { generateSqlDump } from './postgresDb.js';

export function createBackupManager({ dataDir, getDataSnapshot, restoreDataSnapshot, logAudit }) {
  const backupsDir = path.join(dataDir, 'backups');
  fs.mkdirSync(backupsDir, { recursive: true });
  const configFile = path.join(dataDir, 'backup_config.json');

  const DEFAULT_CONFIG = {
    dailyBackupEnabled: true,
    dailyBackupTime: '02:00', // 24-hr format HH:MM
    weeklyBackupEnabled: true,
    weeklyBackupDay: 'Sunday', // Day of week
    weeklyBackupTime: '03:00',
    retentionDays: 30,
    lastDailyRun: null,
    lastWeeklyRun: null,
    history: []
  };

  function loadConfig() {
    try {
      if (fs.existsSync(configFile)) {
        const raw = fs.readFileSync(configFile, 'utf8');
        return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
      }
    } catch (e) {
      console.warn('Could not read backup_config.json, using defaults:', e.message);
    }
    saveConfig(DEFAULT_CONFIG);
    return { ...DEFAULT_CONFIG };
  }

  function saveConfig(cfg) {
    try {
      fs.writeFileSync(configFile, JSON.stringify(cfg, null, 2), 'utf8');
    } catch (e) {
      console.error('Failed to write backup_config.json:', e);
    }
  }

  function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Create a backup snapshot
  function createBackup({ type = 'MANUAL', label = '' } = {}) {
    try {
      const now = new Date();
      const datePart = now.toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
      const cleanLabel = (label || type).toUpperCase().replace(/[^A-Z0-9_-]/g, '');
      const baseFilename = `ongc_backup_${cleanLabel}_${datePart}`;
      
      const snapshot = getDataSnapshot ? getDataSnapshot() : {};
      
      // 1. Save JSON snapshot
      const jsonFilename = `${baseFilename}.json`;
      const jsonPath = path.join(backupsDir, jsonFilename);
      const jsonContent = JSON.stringify({
        metadata: {
          timestamp: now.toISOString(),
          type,
          version: '1.0.0',
          engine: 'ONGC Operations Enterprise'
        },
        data: snapshot
      }, null, 2);
      fs.writeFileSync(jsonPath, jsonContent, 'utf8');

      // 2. Save PostgreSQL SQL dump
      const sqlFilename = `${baseFilename}.sql`;
      const sqlPath = path.join(backupsDir, sqlFilename);
      const sqlDump = generateSqlDump(snapshot);
      fs.writeFileSync(sqlPath, sqlDump, 'utf8');

      const jsonStats = fs.statSync(jsonPath);
      const sqlStats = fs.statSync(sqlPath);

      const record = {
        id: `bck_${Date.now()}`,
        baseName: baseFilename,
        jsonFile: jsonFilename,
        sqlFile: sqlFilename,
        type,
        timestamp: now.toISOString(),
        sizeBytes: jsonStats.size + sqlStats.size,
        sizeFormatted: formatBytes(jsonStats.size + sqlStats.size),
        recordsSummary: {
          users: snapshot.users?.users?.length || 0,
          jobs: snapshot.otFde?.jobs?.length || 0,
          employees: Object.keys(snapshot.otFde?.roster || {}).length || 0,
          auditEntries: snapshot.users?.auditLog?.length || 0
        }
      };

      const cfg = loadConfig();
      if (!cfg.history) cfg.history = [];
      cfg.history.unshift(record);
      if (cfg.history.length > 50) cfg.history = cfg.history.slice(0, 50);

      if (type === 'DAILY') cfg.lastDailyRun = now.toISOString();
      if (type === 'WEEKLY') cfg.lastWeeklyRun = now.toISOString();
      saveConfig(cfg);

      if (logAudit) {
        logAudit('BACKUP_CREATED', 'SYSTEM', { type, files: [jsonFilename, sqlFilename], size: record.sizeFormatted });
      }

      return { success: true, backup: record };
    } catch (err) {
      console.error('Backup creation error:', err);
      return { success: false, error: err.message };
    }
  }

  function listBackups() {
    try {
      const files = fs.readdirSync(backupsDir);
      const result = [];
      const config = loadConfig();
      const historyMap = new Map((config.history || []).map(h => [h.jsonFile, h]));

      for (const file of files) {
        if (!file.endsWith('.json') && !file.endsWith('.sql')) continue;
        const filePath = path.join(backupsDir, file);
        const stats = fs.statSync(filePath);
        const isSql = file.endsWith('.sql');
        const matched = historyMap.get(isSql ? file.replace(/\.sql$/, '.json') : file);

        let type = 'MANUAL';
        if (file.includes('DAILY')) type = 'DAILY';
        else if (file.includes('WEEKLY')) type = 'WEEKLY';

        result.push({
          filename: file,
          format: isSql ? 'PostgreSQL (.sql)' : 'Snapshot (.json)',
          isSql,
          type: matched?.type || type,
          timestamp: stats.mtime.toISOString(),
          sizeBytes: stats.size,
          sizeFormatted: formatBytes(stats.size),
          recordsSummary: matched?.recordsSummary || null
        });
      }

      // Sort by newest first
      result.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      return result;
    } catch (err) {
      console.error('Error listing backups:', err);
      return [];
    }
  }

  function getBackupFilePath(filename) {
    const clean = path.basename(filename);
    const fullPath = path.join(backupsDir, clean);
    if (fs.existsSync(fullPath)) return fullPath;
    return null;
  }

  function deleteBackup(filename) {
    try {
      const filePath = getBackupFilePath(filename);
      if (!filePath) return { success: false, error: 'Backup file not found.' };
      fs.unlinkSync(filePath);
      
      // If deleting .json, also remove corresponding .sql if present, and vice versa
      const companion = filename.endsWith('.json') ? filename.replace(/\.json$/, '.sql') : filename.replace(/\.sql$/, '.json');
      const companionPath = getBackupFilePath(companion);
      if (companionPath) {
        try { fs.unlinkSync(companionPath); } catch (_) {}
      }

      const cfg = loadConfig();
      cfg.history = (cfg.history || []).filter(h => h.jsonFile !== filename && h.sqlFile !== filename && h.jsonFile !== companion);
      saveConfig(cfg);

      if (logAudit) logAudit('BACKUP_DELETED', 'ADMIN', { filename });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  function restoreBackup(filename) {
    try {
      const clean = path.basename(filename);
      // For restore, prefer the .json file
      const jsonFile = clean.endsWith('.sql') ? clean.replace(/\.sql$/, '.json') : clean;
      const filePath = getBackupFilePath(jsonFile);
      if (!filePath) {
        return { success: false, error: `JSON Snapshot file "${jsonFile}" not found for restoration.` };
      }

      const raw = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(raw);
      if (!parsed.data) {
        return { success: false, error: 'Invalid backup format: data payload missing.' };
      }

      if (restoreDataSnapshot) {
        restoreDataSnapshot(parsed.data);
      }

      if (logAudit) logAudit('BACKUP_RESTORED', 'ADMIN', { filename: jsonFile, date: parsed.metadata?.timestamp });
      return { success: true, message: `Successfully restored operations state from backup "${jsonFile}".` };
    } catch (err) {
      console.error('Restore error:', err);
      return { success: false, error: 'Restore failed: ' + err.message };
    }
  }

  // Auto-backup scheduler check
  function checkAndRunScheduledBackups() {
    try {
      const cfg = loadConfig();
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMins = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHours}:${currentMins}`;
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const currentDayName = dayNames[now.getDay()];

      // 1. Daily Auto-Backup
      if (cfg.dailyBackupEnabled) {
        const lastDailyDate = cfg.lastDailyRun ? cfg.lastDailyRun.split('T')[0] : '';
        const targetTime = cfg.dailyBackupTime || '02:00';
        
        // If not run today and current time >= targetTime
        if (lastDailyDate !== todayStr && currentTimeStr >= targetTime) {
          console.log(`[BackupScheduler] Triggering Daily Auto-Backup (Scheduled: ${targetTime}, Current: ${currentTimeStr})...`);
          createBackup({ type: 'DAILY', label: 'AUTO_DAILY' });
        }
      }

      // 2. Weekly Auto-Backup
      if (cfg.weeklyBackupEnabled) {
        const targetDay = cfg.weeklyBackupDay || 'Sunday';
        const targetTime = cfg.weeklyBackupTime || '03:00';
        const lastWeeklyDate = cfg.lastWeeklyRun ? cfg.lastWeeklyRun.split('T')[0] : '';

        // Check if today is the target day and not run today and time reached
        if (currentDayName.toLowerCase() === targetDay.toLowerCase() && lastWeeklyDate !== todayStr && currentTimeStr >= targetTime) {
          console.log(`[BackupScheduler] Triggering Weekly Auto-Backup (Day: ${targetDay}, Time: ${targetTime})...`);
          createBackup({ type: 'WEEKLY', label: 'AUTO_WEEKLY' });
        }
      }
    } catch (err) {
      console.error('[BackupScheduler] Scheduler check error:', err);
    }
  }

  return {
    loadConfig,
    saveConfig,
    createBackup,
    listBackups,
    getBackupFilePath,
    deleteBackup,
    restoreBackup,
    checkAndRunScheduledBackups
  };
}
