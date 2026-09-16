import { execFileSync } from 'node:child_process';
import { copyFileSync, writeFileSync } from 'node:fs';

if (!process.env.CI_PAGES_URL) throw new Error('GitLab must provide CI_PAGES_URL for the Pages deployment.');
const url = new URL(process.env.CI_PAGES_URL);
const base = url.pathname.replace(/\/?$/, '/');
execFileSync('npm', ['run', 'build'], {
  stdio: 'inherit',
  env: { ...process.env, PAGES_BASE_PATH: base }
});
// Existing assets take precedence; unmatched paths serve the React entry point.
writeFileSync('dist/_redirects', `${base}* ${base}index.html 200\n`);
copyFileSync('dist/index.html', 'dist/404.html');
console.log(`Pages bundle prepared for ${url.href}, with router base ${base}`);
