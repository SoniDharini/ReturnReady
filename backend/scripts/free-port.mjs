/**
 * Frees process.env.PORT (default 5000) if something is still listening.
 * Windows-friendly helper used before `npm run dev`.
 */
import { execSync } from 'child_process';

const port = Number(process.env.PORT) || 5000;

function getPidsWindows(portNumber) {
  try {
    const output = execSync(
      `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${portNumber} -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique"`,
      { encoding: 'utf8' },
    );
    return output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0);
  } catch {
    return [];
  }
}

function getPidsUnix(portNumber) {
  try {
    const output = execSync(`lsof -ti tcp:${portNumber} -sTCP:LISTEN`, {
      encoding: 'utf8',
    });
    return output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0);
  } catch {
    return [];
  }
}

const pids = process.platform === 'win32' ? getPidsWindows(port) : getPidsUnix(port);

if (!pids.length) {
  console.log(`Port ${port} is free.`);
  process.exit(0);
}

for (const pid of pids) {
  try {
    process.kill(pid, 'SIGTERM');
    console.log(`Stopped process ${pid} that was using port ${port}.`);
  } catch (error) {
    console.warn(`Could not stop process ${pid}: ${error.message}`);
  }
}

// Give the OS a moment to release the socket
await new Promise((resolve) => setTimeout(resolve, 800));
console.log(`Port ${port} ready.`);
