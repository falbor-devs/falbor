export const ACTION_TIMEOUT_MS = process.env.NODE_ENV === 'development' ? 300_000 : 30_000;
export const LOAD_TIMEOUT_MS = process.env.NODE_ENV === 'development' ? 120_000 : 30_000;
export const TIMEOUT_MESSAGE =
  'The server took too long to respond. It may still be compiling after a code change — try again in a moment.';

export function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
