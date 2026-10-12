class SimpleEventEmitter {
  private _events: Record<string, ((...args: any[]) => void)[]> = {};

  on(event: string, listener: (...args: any[]) => void): void {
    if (!this._events[event]) {
      this._events[event] = [];
    }

    this._events[event].push(listener);
  }

  off(event: string, listener: (...args: any[]) => void): void {
    if (!this._events[event]) {
      return;
    }

    this._events[event] = this._events[event].filter((l) => l !== listener);
  }

  emit(event: string, ...args: any[]): void {
    if (!this._events[event]) {
      return;
    }

    this._events[event].forEach((listener) => listener(...args));
  }

  removeAllListeners(): void {
    this._events = {};
  }
}

export interface ModelHealthStatus {
  provider: 'Ollama' | 'LMStudio' | 'OpenAILike';
  baseUrl: string;
  status: 'healthy' | 'unhealthy' | 'checking' | 'unknown';
  lastChecked: Date;
  responseTime?: number;
  error?: string;
  availableModels?: string[];
  version?: string;
}

export interface HealthCheckResult {
  isHealthy: boolean;
  responseTime: number;
  error?: string;
  availableModels?: string[];
  version?: string;
}

export class LocalModelHealthMonitor extends SimpleEventEmitter {
  private _healthStatuses = new Map<string, ModelHealthStatus>();
  private _checkIntervals = new Map<string, NodeJS.Timeout>();
  private readonly _defaultCheckInterval = 30000;
  private readonly _healthCheckTimeout = 10000;

  constructor() {
    super();
  }

  startMonitoring(provider: 'Ollama' | 'LMStudio' | 'OpenAILike', baseUrl: string, checkInterval?: number): void {
    const key = this._getProviderKey(provider, baseUrl);

    this.stopMonitoring(provider, baseUrl);

    this._healthStatuses.set(key, {
      provider,
      baseUrl,
      status: 'unknown',
      lastChecked: new Date(),
    });

    const interval = setInterval(async () => {
      await this.performHealthCheck(provider, baseUrl);
    }, checkInterval || this._defaultCheckInterval);

    this._checkIntervals.set(key, interval);

    this.performHealthCheck(provider, baseUrl);
  }

  stopMonitoring(provider: 'Ollama' | 'LMStudio' | 'OpenAILike', baseUrl: string): void {
    const key = this._getProviderKey(provider, baseUrl);

    const interval = this._checkIntervals.get(key);

    if (interval) {
      clearInterval(interval);
      this._checkIntervals.delete(key);
    }

    this._healthStatuses.delete(key);
  }

  getHealthStatus(provider: 'Ollama' | 'LMStudio' | 'OpenAILike', baseUrl: string): ModelHealthStatus | undefined {
    const key = this._getProviderKey(provider, baseUrl);
    return this._healthStatuses.get(key);
  }

  getAllHealthStatuses(): ModelHealthStatus[] {
    return Array.from(this._healthStatuses.values());
  }

  async performHealthCheck(
    provider: 'Ollama' | 'LMStudio' | 'OpenAILike',
    baseUrl: string,
  ): Promise<HealthCheckResult> {
    const key = this._getProviderKey(provider, baseUrl);
    const startTime = Date.now();

    const currentStatus = this._healthStatuses.get(key);

    if (currentStatus) {
      currentStatus.status = 'checking';
      currentStatus.lastChecked = new Date();
      this.emit('statusChanged', currentStatus);
    }

    try {
      const result = await this._checkProviderHealth(provider, baseUrl);
      const responseTime = Date.now() - startTime;

      const healthStatus: ModelHealthStatus = {
        provider,
        baseUrl,
        status: result.isHealthy ? 'healthy' : 'unhealthy',
        lastChecked: new Date(),
        responseTime,
        error: result.error,
        availableModels: result.availableModels,
        version: result.version,
      };

      this._healthStatuses.set(key, healthStatus);
      this.emit('statusChanged', healthStatus);

      return {
        isHealthy: result.isHealthy,
        responseTime,
        error: result.error,
        availableModels: result.availableModels,
        version: result.version,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      const healthStatus: ModelHealthStatus = {
        provider,
        baseUrl,
        status: 'unhealthy',
        lastChecked: new Date(),
        responseTime,
        error: errorMessage,
      };

      this._healthStatuses.set(key, healthStatus);
      this.emit('statusChanged', healthStatus);

      return {
        isHealthy: false,
        responseTime,
        error: errorMessage,
      };
    }
  }

  private async _checkProviderHealth(
    provider: 'Ollama' | 'LMStudio' | 'OpenAILike',
    baseUrl: string,
  ): Promise<HealthCheckResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this._healthCheckTimeout);

    try {
      switch (provider) {
        case 'Ollama':
          return await this._checkOllamaHealth(baseUrl, controller.signal);
        case 'LMStudio':
          return await this._checkLMStudioHealth(baseUrl, controller.signal);
        case 'OpenAILike':
          return await this._checkOpenAILikeHealth(baseUrl, controller.signal);
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async _checkOllamaHealth(baseUrl: string, signal: AbortSignal): Promise<HealthCheckResult> {
    try {
      console.log(`[Health Check] Checking Ollama at ${baseUrl}`);

      const response = await fetch(`${baseUrl}/api/tags`, {
        method: 'GET',
        signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as { models?: Array<{ name: string }> };
      const models = data.models?.map((model) => model.name) || [];

      console.log(`[Health Check] Ollama healthy with ${models.length} models`);

      let version: string | undefined;

      try {
        const versionResponse = await fetch(`${baseUrl}/api/version`, { signal });

        if (versionResponse.ok) {
          const versionData = (await versionResponse.json()) as { version?: string };
          version = versionData.version;
        }
      } catch {
      }

      return {
        isHealthy: true,
        responseTime: 0,
        availableModels: models,
        version,
      };
    } catch (error) {
      console.error(`[Health Check] Ollama health check failed:`, error);
      return {
        isHealthy: false,
        responseTime: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async _checkLMStudioHealth(baseUrl: string, signal: AbortSignal): Promise<HealthCheckResult> {
    try {
      const normalizedUrl = baseUrl.includes('/v1') ? baseUrl : `${baseUrl}/v1`;

      const response = await fetch(`${normalizedUrl}/models`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal,
      });

      if (!response.ok) {
        if (response.type === 'opaque' || response.status === 0) {
          throw new Error(
            'CORS_ERROR: LM Studio server is not configured to allow requests from this origin. Please configure CORS in LM Studio settings.',
          );
        }

        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as { data?: Array<{ id: string }> };
      const models = data.data?.map((model) => model.id) || [];

      return {
        isHealthy: true,
        responseTime: 0,
        availableModels: models,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (
        errorMessage.includes('CORS') ||
        errorMessage.includes('NetworkError') ||
        errorMessage.includes('Failed to fetch')
      ) {
        return {
          isHealthy: false,
          responseTime: 0,
          error:
            'CORS_ERROR: LM Studio server is blocking cross-origin requests. Try enabling CORS in LM Studio settings or use Falbor desktop app.',
        };
      }

      return {
        isHealthy: false,
        responseTime: 0,
        error: errorMessage,
      };
    }
  }

  private async _checkOpenAILikeHealth(baseUrl: string, signal: AbortSignal): Promise<HealthCheckResult> {
    try {
      const normalizedUrl = baseUrl.includes('/v1') ? baseUrl : `${baseUrl}/v1`;

      const response = await fetch(`${normalizedUrl}/models`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as { data?: Array<{ id: string }> };
      const models = data.data?.map((model) => model.id) || [];

      return {
        isHealthy: true,
        responseTime: 0,
        availableModels: models,
      };
    } catch (error) {
      return {
        isHealthy: false,
        responseTime: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private _getProviderKey(provider: string, baseUrl: string): string {
    return `${provider}:${baseUrl}`;
  }

  destroy(): void {
    for (const interval of this._checkIntervals.values()) {
      clearInterval(interval);
    }

    this._checkIntervals.clear();
    this._healthStatuses.clear();
    this.removeAllListeners();
  }
}

export const localModelHealthMonitor = new LocalModelHealthMonitor();
