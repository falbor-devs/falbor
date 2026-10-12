export async function runWithConcurrency<T>(items: T[], limit: number, worker: (item: T) => Promise<void>) {
  const queue = [...items];

  await Promise.all(
    Array.from({ length: Math.min(limit, queue.length) }, async () => {
      while (queue.length > 0) {
        const item = queue.shift() as T;
        await worker(item);
      }
    }),
  );
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message.slice(0, 500) : 'Unknown error';
}
