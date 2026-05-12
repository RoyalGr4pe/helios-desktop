import { spawn } from 'child_process';
import http from 'http';

const VITE_PORT = 5173;
const MAX_RETRIES = 30;
const RETRY_INTERVAL = 1000;

function checkViteServer(retries = 0) {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://localhost:${VITE_PORT}`, (res) => {
      resolve(true);
    });
    req.on('error', () => {
      if (retries < MAX_RETRIES) {
        setTimeout(() => checkViteServer(retries + 1).then(resolve).catch(reject), RETRY_INTERVAL);
      } else {
        reject(new Error('Vite server not available'));
      }
    });
  });
}

async function main() {
  try {
    await checkViteServer();
    console.log('Vite server ready, starting Electron...');

    const electron = spawn(
      process.platform === 'win32' ? 'npx.cmd' : 'npx',
      ['electron', '.'],
      { stdio: 'inherit', env: { ...process.env, NODE_ENV: 'development' } }
    );

    electron.on('close', (code) => {
      process.exit(code);
    });
  } catch (err) {
    console.error('Failed to start:', err.message);
    process.exit(1);
  }
}

main();