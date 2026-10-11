import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, realpath, readFile, readdir, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const root = fileURLToPath(new URL('../../', import.meta.url));
const markers = {
  SPREADSHEET_ID: 'PRIVATE_SHEET_CANARY_' + 'a'.repeat(44),
  YOUTUBE_API_KEY: 'PRIVATE_GOOGLE_CANARY_71',
  SERVICE_ACCOUNT_JSON: 'PRIVATE_SERVICE_CANARY_71',
  UNRELATED_SECRET: 'PRIVATE_UNRELATED_CANARY_71',
  VITE_UNRELATED_SECRET: 'PRIVATE_PREFIXED_CANARY_71',
};

async function scriptsIn(dir: string): Promise<string> {
  const entries = await readdir(dir, { withFileTypes: true });
  const contents = await Promise.all(entries.map(entry => entry.isDirectory()
    ? scriptsIn(join(dir, entry.name))
    : /\.(js|html)$/.test(entry.name) ? readFile(join(dir, entry.name), 'utf8') : ''));
  return contents.join('\n');
}

test('production builds exclude private env and browser Sheets code', async (t) => {
  const scratch = await realpath(await mkdtemp(join(tmpdir(), 'public-build-')));
  t.after(() => rm(scratch, { recursive: true, force: true }));
  await writeFile(join(scratch, '.env.production'), Object.entries(markers).map(([key, value]) => `${key}=${value}`).join('\n'));
  // Also verify CI-style process environment values, without using real secrets.
  const previous = process.env.VITE_CI_PRIVATE;
  process.env.VITE_CI_PRIVATE = 'PRIVATE_CI_CANARY_71';
  t.after(() => {
    if (previous === undefined) delete process.env.VITE_CI_PRIVATE; else process.env.VITE_CI_PRIVATE = previous;
  });
  const configFile = join(root, 'vite.config.ts');
  const appOutput = join(scratch, 'app-output');
  await build({ root, configFile, envDir: scratch, logLevel: 'silent', build: { outDir: appOutput } });
  const app = await scriptsIn(appOutput);
  for (const value of [...Object.values(markers), process.env.VITE_CI_PRIVATE]) assert.ok(!app.includes(value), 'private canary entered app build');
  assert.ok(!app.includes('sheets.googleapis.com'), 'private Sheets transport entered browser build');
  assert.ok(!app.includes('SPREADSHEET_ID'), 'private Sheets configuration entered browser build');
  assert.ok(app.includes('data/videos.json'), 'published catalogue reader missing');
  assert.ok(app.includes('/youtube-to-sheets/'), 'built-in BASE_URL missing');

  // A probe deliberately reads the entire env object and direct/dynamic keys.
  // This catches implicit VITE_* exposure even if the app does not reference it.
  const probe = join(scratch, 'probe');
  await mkdir(probe);
  await writeFile(join(probe, 'index.html'), '<script type="module" src="/probe.js"></script>');
  await writeFile(join(probe, 'probe.js'), 'document.body.textContent = JSON.stringify(import.meta.env) + String(import.meta.env[location.hash.slice(1)]) + String(import.meta.env.VITE_UNRELATED_SECRET) + String(import.meta.env.VITE_CI_PRIVATE) + String(import.meta.env.UNRELATED_SECRET);');
  const probeOutput = join(scratch, 'probe-output');
  await build({ root: probe, configFile, envDir: scratch, publicDir: false, logLevel: 'silent', build: { outDir: probeOutput } });
  const output = await scriptsIn(probeOutput);
  for (const value of [...Object.values(markers), process.env.VITE_CI_PRIVATE]) assert.ok(!output.includes(value), 'private canary entered explicit env probe');
});

test('Pages workflow does not supply Google secrets to the frontend build', async () => {
  const workflow = await readFile(join(root, '../.github/workflows/deploy.yml'), 'utf8');
  assert.ok(!/secrets\s*\[|secrets\./.test(workflow), 'Pages build must not receive repository secrets');
});
