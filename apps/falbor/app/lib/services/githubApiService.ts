import type {
  GitHubUserResponse,
  GitHubRepoInfo,
  GitHubBranch,
  GitHubOrganization,
  GitHubStats,
  GitHubLanguageStats,
} from '~/types/GitHub';

export interface GitHubApiServiceConfig {
  token?: string;
  tokenType?: 'classic' | 'fine-grained';
  baseURL?: string;
}

export interface DetailedRepoInfo extends GitHubRepoInfo {
  branches_count?: number;
  contributors_count?: number;
  issues_count?: number;
  pull_requests_count?: number;
}

export interface GitHubApiError {
  message: string;
  status: number;
  code?: string;
}

export class GitHubApiServiceClass {
  private _config: GitHubApiServiceConfig;
  private _baseURL: string;

  constructor(config: GitHubApiServiceConfig = {}) {
    this._config = config;
    this._baseURL = config.baseURL || 'https://api.github.com';
  }
  configure(config: GitHubApiServiceConfig): void {
    this._config = { ...this._config, ...config };
    this._baseURL = config.baseURL || this._baseURL;
  }

  private async _makeRequestInternal<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!this._config.token) {
      throw new Error('GitHub token is required. Call configure() first.');
    }

    const response = await fetch(`${this._baseURL}${endpoint}`, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        Authorization: `${this._config.tokenType === 'classic' ? 'token' : 'Bearer'} ${this._config.token}`,
        'User-Agent': 'Falbor',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData: any = await response.json().catch(() => ({ message: response.statusText }));
      const error: GitHubApiError = {
        message: errorData.message || response.statusText,
        status: response.status,
        code: errorData.code,
      };
      throw error;
    }

    return response.json();
  }
  async getAuthenticatedUser(): Promise<GitHubUserResponse> {
    return this._makeRequestInternal<GitHubUserResponse>('/user');
  }

  async getAllUserRepositories(): Promise<GitHubRepoInfo[]> {
    const allRepos: GitHubRepoInfo[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const repos = await this._makeRequestInternal<GitHubRepoInfo[]>(
        `/user/repos?per_page=100&page=${page}&sort=updated`,
      );

      allRepos.push(...repos);
      hasMore = repos.length === 100;
      page++;
    }

    return allRepos;
  }
  async getDetailedRepositoryInfo(owner: string, repo: string): Promise<DetailedRepoInfo> {
    const [repoInfo, branches] = await Promise.all([
      this._makeRequestInternal<GitHubRepoInfo>(`/repos/${owner}/${repo}`),
      this.getRepositoryBranches(owner, repo).catch(() => []),
    ]);
    const [contributors, issues, pullRequests] = await Promise.allSettled([
      this._getRepositoryContributorsCount(owner, repo),
      this._getRepositoryIssuesCount(owner, repo),
      this._getRepositoryPullRequestsCount(owner, repo),
    ]);

    const detailedInfo: DetailedRepoInfo = {
      ...repoInfo,
      branches_count: branches.length,
      contributors_count: contributors.status === 'fulfilled' ? contributors.value : undefined,
      issues_count: issues.status === 'fulfilled' ? issues.value : undefined,
      pull_requests_count: pullRequests.status === 'fulfilled' ? pullRequests.value : undefined,
    };

    return detailedInfo;
  }

  async getRepositoryBranches(owner: string, repo: string): Promise<GitHubBranch[]> {
    return this._makeRequestInternal<GitHubBranch[]>(`/repos/${owner}/${repo}/branches`);
  }
  private async _getRepositoryContributorsCount(owner: string, repo: string): Promise<number> {
    const response = await fetch(`${this._baseURL}/repos/${owner}/${repo}/contributors?per_page=1`, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        Authorization: `${this._config.tokenType === 'classic' ? 'token' : 'Bearer'} ${this._config.token}`,
        'User-Agent': 'Falbor',
      },
    });

    if (!response.ok) {
      return 0;
    }

    const linkHeader = response.headers.get('Link');

    if (linkHeader) {
      const match = linkHeader.match(/page=(\d+)>; rel="last"/);
      return match ? parseInt(match[1], 10) : 1;
    }

    const data = await response.json();

    return Array.isArray(data) ? data.length : 0;
  }
  private async _getRepositoryIssuesCount(owner: string, repo: string): Promise<number> {
    const response = await fetch(`${this._baseURL}/repos/${owner}/${repo}/issues?state=all&per_page=1`, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        Authorization: `${this._config.tokenType === 'classic' ? 'token' : 'Bearer'} ${this._config.token}`,
        'User-Agent': 'Falbor',
      },
    });

    if (!response.ok) {
      return 0;
    }

    const linkHeader = response.headers.get('Link');

    if (linkHeader) {
      const match = linkHeader.match(/page=(\d+)>; rel="last"/);
      return match ? parseInt(match[1], 10) : 1;
    }

    const data = await response.json();

    return Array.isArray(data) ? data.length : 0;
  }
  private async _getRepositoryPullRequestsCount(owner: string, repo: string): Promise<number> {
    const response = await fetch(`${this._baseURL}/repos/${owner}/${repo}/pulls?state=all&per_page=1`, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        Authorization: `${this._config.tokenType === 'classic' ? 'token' : 'Bearer'} ${this._config.token}`,
        'User-Agent': 'Falbor',
      },
    });

    if (!response.ok) {
      return 0;
    }

    const linkHeader = response.headers.get('Link');

    if (linkHeader) {
      const match = linkHeader.match(/page=(\d+)>; rel="last"/);
      return match ? parseInt(match[1], 10) : 1;
    }

    const data = await response.json();

    return Array.isArray(data) ? data.length : 0;
  }
  async getDetailedRepositoriesInfo(
    repos: GitHubRepoInfo[],
    batchSize: number = 5,
    delayMs: number = 100,
  ): Promise<DetailedRepoInfo[]> {
    const detailedRepos: DetailedRepoInfo[] = [];

    for (let i = 0; i < repos.length; i += batchSize) {
      const batch = repos.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(
        batch.map((repo) => {
          const [owner, repoName] = repo.full_name.split('/');
          return this.getDetailedRepositoryInfo(owner, repoName);
        }),
      );

      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          detailedRepos.push(result.value);
        } else {
          console.error(`Failed to fetch details for ${batch[index].full_name}:`, result.reason);
          detailedRepos.push(batch[index]);
        }
      });
      if (i + batchSize < repos.length) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    return detailedRepos;
  }
  calculateRepositoryStats(repos: DetailedRepoInfo[]): {
    languages: GitHubLanguageStats;
    mostUsedLanguages: Array<{ language: string; bytes: number; repos: number }>;
    totalBranches: number;
    totalContributors: number;
    totalIssues: number;
    totalPullRequests: number;
    repositoryHealth: {
      healthy: number;
      active: number;
      archived: number;
      forked: number;
    };
  } {
    const languages: GitHubLanguageStats = {};
    const languageBytes: Record<string, number> = {};
    const languageRepos: Record<string, number> = {};

    let totalBranches = 0;
    let totalContributors = 0;
    let totalIssues = 0;
    let totalPullRequests = 0;

    let healthyRepos = 0;
    let activeRepos = 0;
    let archivedRepos = 0;
    let forkedRepos = 0;

    repos.forEach((repo) => {
      if (repo.language) {
        languages[repo.language] = (languages[repo.language] || 0) + 1;
        languageBytes[repo.language] = (languageBytes[repo.language] || 0) + (repo.size || 0);
        languageRepos[repo.language] = (languageRepos[repo.language] || 0) + 1;
      }
      totalBranches += repo.branches_count || 0;
      totalContributors += repo.contributors_count || 0;
      totalIssues += repo.issues_count || 0;
      totalPullRequests += repo.pull_requests_count || 0;
      const daysSinceUpdate = Math.floor((Date.now() - new Date(repo.updated_at).getTime()) / (1000 * 60 * 60 * 24));
      if (repo.archived) {
        archivedRepos++;
      } else if (repo.fork) {
        forkedRepos++;
      } else if (daysSinceUpdate < 7) {
        activeRepos++;
      } else if (daysSinceUpdate < 30 && repo.stargazers_count > 0) {
        healthyRepos++;
      }
    });
    const mostUsedLanguages = Object.entries(languageBytes)
      .map(([language, bytes]) => ({
        language,
        bytes,
        repos: languageRepos[language] || 0,
      }))
      .sort((a, b) => b.bytes - a.bytes)
      .slice(0, 20);
    return {
      languages,
      mostUsedLanguages,
      totalBranches,
      totalContributors,
      totalIssues,
      totalPullRequests,
      repositoryHealth: {
        healthy: healthyRepos,
        active: activeRepos,
        archived: archivedRepos,
        forked: forkedRepos,
      },
    };
  }
  async generateComprehensiveStats(userData: GitHubUserResponse): Promise<GitHubStats> {
    try {
      const allRepos = await this.getAllUserRepositories();
      const detailedRepos = await this.getDetailedRepositoriesInfo(allRepos);
      const stats = this.calculateRepositoryStats(detailedRepos);
      const [organizations, recentActivity] = await Promise.allSettled([
        this._makeRequestInternal<GitHubOrganization[]>('/user/orgs'),
        this._makeRequestInternal<any[]>(`/users/${userData.login}/events?per_page=10`),
      ]);
      const totalStars = detailedRepos.reduce((sum, repo) => sum + repo.stargazers_count, 0);
      const totalForks = detailedRepos.reduce((sum, repo) => sum + repo.forks_count, 0);
      const privateRepos = detailedRepos.filter((repo) => repo.private).length;
      const githubStats: GitHubStats = {
        repos: detailedRepos,
        recentActivity:
          recentActivity.status === 'fulfilled'
            ? recentActivity.value.slice(0, 10).map((event: any) => ({
              id: event.id,
              type: event.type,
              repo: { name: event.repo.name, url: event.repo.url },
              created_at: event.created_at,
              payload: event.payload || {},
            }))
            : [],
        languages: stats.languages,
        totalGists: userData.public_gists || 0,
        publicRepos: userData.public_repos || 0,
        privateRepos,
        stars: totalStars,
        forks: totalForks,
        followers: userData.followers || 0,
        publicGists: userData.public_gists || 0,
        privateGists: 0,
        lastUpdated: new Date().toISOString(),
        totalStars,
        totalForks,
        organizations: organizations.status === 'fulfilled' ? organizations.value : [],
        totalBranches: stats.totalBranches,
        totalContributors: stats.totalContributors,
        totalIssues: stats.totalIssues,
        totalPullRequests: stats.totalPullRequests,
        mostUsedLanguages: stats.mostUsedLanguages,
      };

      return githubStats;
    } catch (error) {
      console.error('Error generating comprehensive stats:', error);
      throw error;
    }
  }
  async fetchUser(
    token: string,
    tokenType: 'classic' | 'fine-grained' = 'classic',
  ): Promise<{ user: GitHubUserResponse; rateLimit: any }> {
    this.configure({ token, tokenType });

    const [user, rateLimit] = await Promise.all([
      this.getAuthenticatedUser(),
      this._makeRequestInternal('/rate_limit'),
    ]);

    return { user, rateLimit };
  }
  async fetchStats(token: string, tokenType: 'classic' | 'fine-grained' = 'classic'): Promise<GitHubStats> {
    this.configure({ token, tokenType });

    const user = await this.getAuthenticatedUser();

    return this.generateComprehensiveStats(user);
  }
  clearCache(): void {
  }
  clearUserCache(_token: string): void {
  }
}

export const gitHubApiService = new GitHubApiServiceClass();
