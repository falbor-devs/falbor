export function bufferWatchEvents<T extends unknown[]>(timeInMs: number, cb: (events: T[]) => unknown) {
  let timeoutId: number | undefined;
  let events: T[] = [];
  let processing: Promise<unknown> = Promise.resolve();
  const scheduleBufferTick = () => {
    timeoutId = self.setTimeout(async () => {
      await processing;

      if (events.length > 0) {
        processing = Promise.resolve(cb(events));
      }

      timeoutId = undefined;
      events = [];
    }, timeInMs);
  };

  return (...args: T) => {
    events.push(args);

    if (!timeoutId) {
      scheduleBufferTick();
    }
  };
}
