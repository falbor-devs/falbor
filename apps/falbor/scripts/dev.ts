import { spawn } from 'node:child_process';

const next = spawn('next', ['dev', '-p', '3000'], { stdio: 'inherit', shell: true });
const worker = spawn('tsx', ['scripts/agent-worker.ts'], { stdio: 'inherit', shell: true });

const shutdown = () => {
  next.kill('SIGTERM');
  worker.kill('SIGTERM');
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
next.on('exit', (code) => {
  worker.kill('SIGTERM');
  process.exit(code || 0);
});
