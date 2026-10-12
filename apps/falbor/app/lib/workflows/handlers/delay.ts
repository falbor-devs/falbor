export async function handleDelay(nodeData: any, jobId: string) {
  const { delayMs } = nodeData;
  if (!delayMs || typeof delayMs !== 'number') {
    throw new Error('Delay node requires delayMs');
  }
  const runAt = new Date(Date.now() + delayMs);
  return { __delay: true, runAt };
}
