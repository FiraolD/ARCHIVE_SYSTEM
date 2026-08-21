/**
 * Database backup script for INSUREARCH.
 *
 * Creates a full logical backup (schema + data) using pg_dump.
 * Requires the PostgreSQL client tools (pg_dump) to be available on PATH.
 *
 * Usage:
 *   npm run db:backup              -> writes backup to ./backups
 *   BACKUP_DIR=D:\backups npm run db:backup  -> custom output directory
 */

require('dotenv').config();
const { execFile, execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { query } = require('../config/database');

const backupDir = process.env.BACKUP_DIR || path.join(__dirname, '../../backups');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const outputFile = path.join(backupDir, `insurearch-${timestamp}.sql`);

const required = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER'];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

/** Get a binary's major version, e.g. 17 from "pg_dump (PostgreSQL) 17.2" */
const getMajorVersion = (binPath) => {
  try {
    const out = execFileSync(binPath, ['--version'], { encoding: 'utf8' });
    const match = out.match(/(\d+)(\.\d+)?/);
    return match ? parseInt(match[1], 10) : 0;
  } catch {
    return 0;
  }
};

/**
 * Find a pg_dump whose major version is >= the server's major version.
 * Candidates: PG_DUMP_PATH env, standard Windows install dirs, then PATH.
 */
const findPgDump = (serverMajor) => {
  const candidates = [];

  if (process.env.PG_DUMP_PATH) candidates.push(process.env.PG_DUMP_PATH);

  const pgRoot = 'C:\\Program Files\\PostgreSQL';
  if (fs.existsSync(pgRoot)) {
    const versions = fs.readdirSync(pgRoot)
      .filter(d => /^\d+$/.test(d))
      .map(Number)
      .sort((a, b) => b - a); // newest first
    for (const v of versions) {
      candidates.push(path.join(pgRoot, String(v), 'bin', 'pg_dump.exe'));
    }
  }

  candidates.push('pg_dump'); // PATH fallback

  for (const bin of candidates) {
    const major = getMajorVersion(bin);
    if (major >= serverMajor) return bin;
  }
  return null;
};

(async () => {
  try {
    // Determine server major version so we can pick a compatible pg_dump
    const versionResult = await query('SHOW server_version_num');
    const serverMajor = Math.floor(parseInt(versionResult.rows[0].server_version_num, 10) / 10000);

    const pgDumpBin = findPgDump(serverMajor);
    if (!pgDumpBin) {
      console.error(`❌ No pg_dump found with version >= ${serverMajor} (server is PostgreSQL ${serverMajor}).`);
      console.error('   Install matching PostgreSQL client tools or set PG_DUMP_PATH in .env.');
      process.exit(1);
    }

    const args = [
      '-h', process.env.DB_HOST,
      '-p', process.env.DB_PORT,
      '-U', process.env.DB_USER,
      '-d', process.env.DB_NAME,
      '--format=plain',
      '--no-owner',
      '--no-privileges',
      '--file', outputFile
    ];

    console.log(`Backing up "${process.env.DB_NAME}" @ ${process.env.DB_HOST}:${process.env.DB_PORT} (server v${serverMajor})`);
    console.log(`Using ${pgDumpBin}`);

    const env = { ...process.env, PGPASSWORD: process.env.DB_PASSWORD || '' };

    execFile(pgDumpBin, args, { env, maxBuffer: 1024 * 1024 * 512 }, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Backup failed:', stderr || error.message);
        // Remove partial output
        if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
        process.exit(1);
      }

      const size = fs.statSync(outputFile).size;
      console.log(`✅ Backup completed: ${outputFile} (${(size / 1024).toFixed(1)} KB)`);

      // Retention: keep only the last 14 backups
      const backups = fs.readdirSync(backupDir)
        .filter(f => f.startsWith('insurearch-') && f.endsWith('.sql'))
        .sort()
        .reverse();

      if (backups.length > 14) {
        for (const old of backups.slice(14)) {
          fs.unlinkSync(path.join(backupDir, old));
          console.log(`🗑️  Removed old backup: ${old}`);
        }
      }
      process.exit(0);
    });
  } catch (err) {
    console.error('❌ Backup failed:', err.message);
    process.exit(1);
  }
})();
