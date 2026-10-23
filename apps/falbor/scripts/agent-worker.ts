import 'dotenv/config';

const workerUrl = process.env.AGENT_WORKER_URL || 'http://localhost:3000/api/cron/agents';
const cronSecret = process.env.CRON_SECRET || 'local-agent-worker';
let busy = false;

async function tick() {
  if (busy || !cronSecret) return;
  busy = true;
  try {
    const response = await fetch(workerUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cronSecret}`, 'Content-Type': 'application/json' },
      body: '{}',
    });
    if (!response.ok) process.stderr.write(`Agent worker returned ${response.status}\n`);
  } catch (error) {
    if (error instanceof Error && !error.message.includes('ECONNREFUSED')) process.stderr.write(`${error.message}\n`);
  } finally {
    busy = false;
  }
}

void tick();
setInterval(() => void tick(), 2000);
