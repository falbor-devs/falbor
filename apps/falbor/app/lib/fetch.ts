export async function request(url: string, init?: RequestInit) {
  return fetch(url, init);
}
