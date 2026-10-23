import assert from 'node:assert/strict';
import { ESLint } from 'eslint';

// These intentionally invalid in-memory fixtures guard against silently
// ignoring TypeScript again, and prove the Hooks rule is actually active.
const eslint = new ESLint();
for (const extension of ['ts', 'tsx']) {
  const [result] = await eslint.lintText('const unusedMarker = 1;', {
    filePath: `src/lint-coverage-probe.${extension}`,
  });
  assert.ok(result.messages.some(message => message.ruleId === '@typescript-eslint/no-unused-vars'),
    `ESLint must analyze ${extension} source files`);
}
const [hooks] = await eslint.lintText(`
  import { useEffect } from 'react';
  export function Probe() {
    if (Math.random() > 0.5) useEffect(() => {}, []);
    return null;
  }
`, { filePath: 'src/lint-hooks-probe.tsx' });
assert.ok(hooks.messages.some(message => message.ruleId === 'react-hooks/rules-of-hooks'),
  'Conditional Hooks must fail lint');
console.log('Lint coverage verified: TS, TSX and Hooks.');
