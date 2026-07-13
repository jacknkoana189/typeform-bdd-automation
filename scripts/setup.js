// Checks this machine can run the suite and installs whatever is missing//

// npm run setup//

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ok = (msg) => console.log(`  OK  ${msg}`);
const fail = (msg) => {
  console.error(`\nPROBLEM: ${msg}\n`);
  process.exit(1);
};
const run = (cmd) => spawnSync(cmd, { shell: true, stdio: 'inherit' }).status === 0;

console.log('Checking your setup...\n');

//Node version//

const major = Number(process.versions.node.split('.')[0]);
if (major < 18) {
  fail(
    `Node.js 18 or newer is required, but you are running ${process.versions.node}.\n` +
    'Install a current version from https://nodejs.org and run "npm run setup" again.'
  );
}
ok(`Node.js ${process.versions.node}`);

//npm dependencies//

const root = path.join(__dirname, '..');
if (!fs.existsSync(path.join(root, 'node_modules', '@cucumber'))) {
  console.log('\nInstalling npm dependencies...\n');
  if (!run('npm install')) {
    fail('"npm install" failed. Check the output above; the usual cause is no internet access.');
  }
}
ok('npm dependencies installed');

// Playwright's Chromium browser//

let browserPath = null;
try {
  browserPath = require('playwright').chromium.executablePath();
} catch {
  // playwright not resolvable; the install below sorts it out
}
if (!browserPath || !fs.existsSync(browserPath)) {
  console.log('\nDownloading Chromium for Playwright (one-time download)...\n');
  if (!run('npx playwright install chromium')) {
    fail('The Chromium download failed. Check the output above; the usual cause is no internet access.');
  }
}
ok('Playwright Chromium browser present');

console.log('\nYou are good to go. Run the tests with: npm test\n');
