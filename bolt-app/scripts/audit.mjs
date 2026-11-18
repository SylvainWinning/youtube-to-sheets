import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const advisory = 'https://github.com/advisories/GHSA-fc5q-39xc-vjpf';
const reviewDate = '2026-12-02';
const result = spawnSync('npm', ['audit', '--audit-level=low', '--json'], {
  encoding: 'utf8',
  maxBuffer: 16 * 1024 * 1024,
});

// Keep the complete npm report, including any exempted findings, in the logs.
process.stdout.write(result.stdout ?? '');
process.stderr.write(result.stderr ?? '');
if (result.error) throw result.error;
if (result.status === 0) process.exit(0);
if (result.status !== 1 || Date.now() >= Date.parse(reviewDate)) process.exit(1);

const { error, auditReportVersion, vulnerabilities, metadata } = JSON.parse(result.stdout);
const findings = Object.entries(vulnerabilities ?? {});
if (error || auditReportVersion !== 2 || !findings.length ||
    findings.length !== metadata?.vulnerabilities?.total) {
  process.exit(1);
}

const { packages } = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url)));

// Admit only development-only findings traceable entirely to this advisory.
// Resolve the direct finding first, then its transitive dependants.
const exempted = new Set();
let previousSize;
do {
  previousSize = exempted.size;
  for (const [name, { nodes, via }] of findings) {
    if (nodes?.length && nodes.every(path => packages[path]?.dev === true) &&
        via?.length && via.every(cause => typeof cause === 'string'
          ? exempted.has(cause)
          : name === 'picomatch' && cause?.name === name && cause.url === advisory)) {
      exempted.add(name);
    }
  }
} while (exempted.size > previousSize);

if (!exempted.has('picomatch') || exempted.size !== findings.length) process.exit(1);

console.log(`::warning::Temporary development-only exception for ${advisory}. Review by ${reviewDate} (00:00 UTC).`);
