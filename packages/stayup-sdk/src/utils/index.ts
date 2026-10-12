export function generateFingerprint(message?: string, stacktrace?: string, url?: string): string {
  const parts = [];
  if (stacktrace) {
    // Basic normalization of stacktrace: take first two lines, strip line numbers
    const lines = stacktrace.split('\n');
    const normalizedStack = lines.slice(0, 3).map(line => line.replace(/:\d+:\d+/g, '')).join('|');
    parts.push(normalizedStack);
  } else if (message) {
    parts.push(message);
  }
  
  if (url) {
    // Strip query parameters from URL for grouping
    try {
      const parsedUrl = new URL(url);
      parts.push(parsedUrl.pathname);
    } catch {
      parts.push(url);
    }
  }

  const rawFingerprint = parts.join('||');
  
  // Simple hash function for client-side fingerprinting
  let hash = 0;
  for (let i = 0; i < rawFingerprint.length; i++) {
    const char = rawFingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
}

export function getBrowserInfo() {
  if (typeof window === 'undefined') return {};
  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    url: window.location.href,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight
  };
}
