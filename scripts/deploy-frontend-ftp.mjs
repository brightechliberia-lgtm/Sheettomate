/**
 * Upload deploy/frontend to Namecheap cPanel via FTP.
 *
 * Usage:
 *   1. Copy .env.deploy.example → .env.deploy and fill FTP_* values
 *   2. npm run build:frontend   (or let deploy:frontend build for you)
 *   3. npm run deploy:frontend
 *
 * Does not delete cgi-bin / .well-known. Clears remote assets/ then syncs the build.
 */
import { Client } from 'basic-ftp';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

async function loadEnvFile(filePath) {
  try {
    let raw = await fs.readFile(filePath, 'utf8');
    if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
    let count = 0;
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq < 1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      // File values win (including over empty env vars left in the shell).
      process.env[key] = val;
      count += 1;
    }
    if (count) console.log(`Loaded ${count} vars from ${path.basename(filePath)}`);
  } catch {
    /* optional */
  }
}

await loadEnvFile(path.join(root, 'env.deploy'));
await loadEnvFile(path.join(root, '.env.deploy'));

const host = process.env.FTP_HOST;
const user = process.env.FTP_USER;
const pass = process.env.FTP_PASS;
const port = Number(process.env.FTP_PORT || 21);
const remoteDir = (process.env.FTP_REMOTE_DIR || 'public_html').replace(/^\/+|\/+$/g, '');
const localDir = path.join(root, 'deploy', 'frontend');

if (!host || !user || !pass) {
  console.error('Missing FTP_HOST / FTP_USER / FTP_PASS.');
  console.error('Edit env.deploy in the project root (copy from .env.deploy.example if needed).');
  process.exit(1);
}

try {
  await fs.access(path.join(localDir, 'index.html'));
} catch {
  console.error(`No build at ${localDir}. Run: npm run build:frontend`);
  process.exit(1);
}

const KEEP_TOP = new Set(['cgi-bin', '.well-known', 'mail', '.ftpquota']);

const client = new Client(60_000);
client.ftp.verbose = process.env.FTP_VERBOSE === 'true';

async function ensureRemoteRoot() {
  if (!remoteDir || remoteDir === '.') {
    return;
  }
  await client.ensureDir(remoteDir);
  await client.cd('/' + remoteDir.split('/').filter(Boolean).join('/'));
}

async function clearStaleAssets() {
  try {
    await client.cd('assets');
  } catch {
    return;
  }
  const list = await client.list();
  for (const item of list) {
    if (item.name === '.' || item.name === '..') continue;
    if (item.isDirectory) await client.removeDir(item.name);
    else await client.remove(item.name);
  }
  await client.cdup();
}

async function removeStaleRootFiles(localNames) {
  const remote = await client.list();
  for (const item of remote) {
    if (item.name === '.' || item.name === '..') continue;
    if (KEEP_TOP.has(item.name)) continue;
    if (item.isDirectory) {
      if (item.name === 'assets') continue; // refreshed separately
      continue; // do not delete unknown dirs
    }
    // Remove old root files we manage if no longer in the build (e.g. old zip leftovers)
    if (!localNames.has(item.name) && /\.(html|js|css|webmanifest|svg|png|ico|txt|map)$/i.test(item.name)) {
      await client.remove(item.name);
    }
    if (item.name.endsWith('.zip') && item.name.includes('frontend')) {
      await client.remove(item.name);
    }
  }
}

try {
  console.log(`Connecting to ${host}:${port} as ${user} ...`);
  await client.access({
    host,
    user,
    password: pass,
    port,
    secure: false,
  });

  // Start from FTP account home
  await client.cd('/');
  await ensureRemoteRoot();
  console.log(`Remote cwd: ${await client.pwd()}`);

  const localEntries = await fs.readdir(localDir);
  const localNames = new Set(localEntries);

  console.log('Clearing remote assets/ ...');
  await clearStaleAssets();

  console.log(`Uploading ${localDir} → ${remoteDir || '(FTP home)'} ...`);
  await client.uploadFromDir(localDir);

  console.log('Cleaning stale root files ...');
  await removeStaleRootFiles(localNames);

  console.log('Frontend deploy complete.');
} catch (err) {
  console.error('FTP deploy failed:', err instanceof Error ? err.message : err);
  process.exit(1);
} finally {
  client.close();
}
