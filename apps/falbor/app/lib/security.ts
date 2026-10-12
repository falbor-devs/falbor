export interface RouteArgs {
  request: Request;
  context: {
    cloudflare?: {
      env?: Record<string, string>;
    };
    env?: Record<string, string>;
  };
  params?: Record<string, string | string[]>;
}
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMITS = {
  // General API endpoints
  '/api/*': { windowMs: 15 * 60 * 1000, maxRequests: 100 },
  // LLM API (more restrictive)
  '/api/llmcall': { windowMs: 60 * 1000, maxRequests: 10 },
  // GitHub API endpoints
  '/api/github-*': { windowMs: 60 * 1000, maxRequests: 30 },
  // Netlify API endpoints
  '/api/netlify-*': { windowMs: 60 * 1000, maxRequests: 20 },
};
export function checkRateLimit(request: Request, endpoint: string): { allowed: boolean; resetTime?: number } {
  const clientIP = getClientIP(request);
  const key = `${clientIP}:${endpoint}`;
  const rule = Object.entries(RATE_LIMITS).find(([pattern]) => {
    if (pattern.endsWith('/*')) {
      const basePattern = pattern.slice(0, -2);
      return endpoint.startsWith(basePattern);
    }

    return endpoint === pattern;
  });

  if (!rule) {
    return { allowed: true };
  }

  const [, config] = rule;
  const now = Date.now();
  const windowStart = now - config.windowMs;
  for (const [storedKey, data] of rateLimitStore.entries()) {
    if (data.resetTime < windowStart) {
      rateLimitStore.delete(storedKey);
    }
  }
  const rateLimitData = rateLimitStore.get(key) || { count: 0, resetTime: now + config.windowMs };

  if (rateLimitData.count >= config.maxRequests) {
    return { allowed: false, resetTime: rateLimitData.resetTime };
  }
  rateLimitData.count++;
  rateLimitStore.set(key, rateLimitData);

  return { allowed: true };
}

function getClientIP(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  return cfConnectingIP || realIP || forwardedFor?.split(',')[0]?.trim() || 'unknown';
}
export function createSecurityHeaders() {
  return {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https://api.github.com https://api.netlify.com",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': ['camera=()', 'microphone=()', 'geolocation=()', 'payment=()'].join(', '),
    ...(process.env.NODE_ENV === 'production'
      ? {
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      }
      : {}),
  };
}
export function validateApiKeyFormat(apiKey: string, provider: string): boolean {
  if (!apiKey || typeof apiKey !== 'string') {
    return false;
  }
  const minLengths: Record<string, number> = {
    anthropic: 50,
    openai: 50,
    groq: 50,
    google: 30,
    github: 30,
    netlify: 30,
  };

  const minLength = minLengths[provider.toLowerCase()] || 20;

  return apiKey.length >= minLength && !apiKey.includes('your_') && !apiKey.includes('here');
}
export function sanitizeErrorMessage(error: unknown, isDevelopment = false): string {
  if (isDevelopment) {
    return error instanceof Error ? error.message : String(error);
  }
  if (error instanceof Error) {
    if (error.message.includes('API key') || error.message.includes('token') || error.message.includes('secret')) {
      return 'Authentication failed';
    }

    if (error.message.includes('rate limit') || error.message.includes('429')) {
      return 'Rate limit exceeded. Please try again later.';
    }
  }

  return 'An unexpected error occurred';
}
export function withSecurity<T extends (args: RouteArgs) => Promise<Response>>(
  handler: T,
  options: {
    requireAuth?: boolean;
    rateLimit?: boolean;
    allowedMethods?: string[];
  } = {},
) {
  return async (args: RouteArgs): Promise<Response> => {
    const { request } = args;
    const url = new URL(request.url);
    const endpoint = url.pathname;
    if (options.allowedMethods && !options.allowedMethods.includes(request.method)) {
      return new Response('Method not allowed', {
        status: 405,
        headers: createSecurityHeaders(),
      });
    }
    if (options.rateLimit !== false) {
      const rateLimitResult = checkRateLimit(request, endpoint);

      if (!rateLimitResult.allowed) {
        return new Response('Rate limit exceeded', {
          status: 429,
          headers: {
            ...createSecurityHeaders(),
            'Retry-After': Math.ceil((rateLimitResult.resetTime! - Date.now()) / 1000).toString(),
            'X-RateLimit-Reset': rateLimitResult.resetTime!.toString(),
          },
        });
      }
    }

    try {
      const response = await handler(args);
      const responseHeaders = new Headers(response.headers);
      Object.entries(createSecurityHeaders()).forEach(([key, value]) => {
        responseHeaders.set(key, value);
      });
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const bodyClone = response.clone();
        try {
          const jsonBody = await bodyClone.json();
          scanForSensitiveData(jsonBody);
        } catch (err: any) {
          if (err.message && err.message.startsWith('Response blocked:')) {
            console.error('Response scan blocked:', err.message);
            return new Response(
              JSON.stringify({
                error: true,
                message: err.message,
              }),
              {
                status: 500,
                headers: {
                  ...createSecurityHeaders(),
                  'Content-Type': 'application/json',
                },
              }
            );
          }
        }
      }

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    } catch (error) {
      console.error('Security-wrapped handler error:', error);

      const errorMessage = sanitizeErrorMessage(error, process.env.NODE_ENV === 'development');

      return new Response(
        JSON.stringify({
          error: true,
          message: errorMessage,
        }),
        {
          status: 500,
          headers: {
            ...createSecurityHeaders(),
            'Content-Type': 'application/json',
          },
        },
      );
    }
  };
}

function scanForSensitiveData(obj: any): void {
  if (!obj || typeof obj !== 'object') {
    if (typeof obj === 'string') {
      const envValues = Object.entries(process.env);
      for (const [key, val] of envValues) {
        if (!val || val.length < 8) continue;
        if (['NODE_ENV', 'PATH', 'PORT', 'TERM', 'SHELL', 'PWD', 'HOME', 'USER'].includes(key)) continue;
        if (obj === val) {
          throw new Error(`Response blocked: contains sensitive value from process.env.${key}`);
        }
      }
    }
    return;
  }

  if (Array.isArray(obj)) {
    for (const item of obj) {
      scanForSensitiveData(item);
    }
    return;
  }

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (
      lowerKey.includes('apikey') ||
      lowerKey.includes('token') ||
      lowerKey.includes('secret') ||
      lowerKey.includes('password')
    ) {
      throw new Error(`Response blocked: sensitive key "${key}" detected`);
    }
    scanForSensitiveData(value);
  }
}

