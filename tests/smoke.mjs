import assert from 'node:assert/strict';
import { smokePaths } from '../src/routes.js';
for (const path of smokePaths) {
  const response = await fetch(`http://127.0.0.1:4173${path}`);
  assert.equal(response.status, 200, `${path} HTTP status`);
  const html = await response.text();
  assert.match(html, /<div id="root"><\/div>/, `${path} serves the SPA entry point`);
  assert.match(html, /assets\/.+\.js/, `${path} loads a production JS bundle`);
}
console.log(`Production preview serves all ${smokePaths.length} configured routes. Browser rendering is checked separately by Playwright.`);
