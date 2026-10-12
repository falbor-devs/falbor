import { atom } from 'nanostores';
import type { VercelConnection } from '~/types/vercel';
import { logStore } from './logs';
import { toast } from 'react-toastify';

const storedConnection = typeof window !== 'undefined' ? localStorage.getItem('vercel_connection') : null;
let initialConnection: VercelConnection;

if (storedConnection) {
  try {
    const parsed = JSON.parse(storedConnection);
    initialConnection = parsed;
  } catch (error) {
    console.error('Error parsing saved Vercel connection:', error);
    initialConnection = {
      user: null,
      token: '',
      stats: undefined,
    };
  }
} else {
  initialConnection = {
    user: null,
    token: '',
    stats: undefined,
  };
}

export const vercelConnection = atom<VercelConnection>(initialConnection);
export const isConnecting = atom<boolean>(false);
export const isFetchingStats = atom<boolean>(false);

export const updateVercelConnection = (updates: Partial<VercelConnection>) => {
  const currentState = vercelConnection.get();
  const newState = { ...currentState, ...updates };
  vercelConnection.set(newState);

  if (typeof window !== 'undefined') {
    localStorage.setItem('vercel_connection', JSON.stringify(newState));
  }
};

export async function autoConnectVercel() {
  const currentState = vercelConnection.get();

  if (!currentState.token) {
    return { success: false, error: 'No token' };
  }

  try {
    console.log('Setting isConnecting to true');
    isConnecting.set(true);

    console.log('Making API call to Vercel');

    const response = await fetch('https://api.vercel.com/v2/user', {
      headers: {
        Authorization: `Bearer ${currentState.token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('Vercel API response status:', response.status);

    if (!response.ok) {
      throw new Error(`Vercel API error: ${response.status}`);
    }

    const userData = (await response.json()) as any;
    console.log('Vercel API response userData:', userData);

    console.log('Updating Vercel connection');
    updateVercelConnection({
      user: userData.user || userData,
    });

    logStore.logInfo('Auto-connected to Vercel', {
      type: 'system',
      message: `Auto-connected to Vercel as ${userData.user?.username || userData.username}`,
    });

    console.log('Fetching Vercel stats');
    await fetchVercelStats(currentState.token);

    console.log('Vercel auto-connection successful');

    return { success: true };
  } catch (error) {
    console.error('Failed to auto-connect to Vercel:', error);
    logStore.logError(`Vercel auto-connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`, {
      type: 'system',
      message: 'Vercel auto-connection failed',
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  } finally {
    console.log('Setting isConnecting to false');
    isConnecting.set(false);
  }
}

export function initializeVercelConnection() {
}

export const fetchVercelStatsViaAPI = fetchVercelStats;

export async function fetchVercelStats(token: string) {
  try {
    isFetchingStats.set(true);

    const projectsResponse = await fetch('https://api.vercel.com/v9/projects', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!projectsResponse.ok) {
      throw new Error(`Failed to fetch projects: ${projectsResponse.status}`);
    }

    const projectsData = (await projectsResponse.json()) as any;
    const projects = projectsData.projects || [];

    const projectsWithDeployments = await Promise.all(
      projects.map(async (project: any) => {
        try {
          const deploymentsResponse = await fetch(
            `https://api.vercel.com/v6/deployments?projectId=${project.id}&limit=1`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            },
          );

          if (deploymentsResponse.ok) {
            const deploymentsData = (await deploymentsResponse.json()) as any;
            return {
              ...project,
              latestDeployments: deploymentsData.deployments || [],
            };
          }

          return project;
        } catch (error) {
          console.error(`Error fetching deployments for project ${project.id}:`, error);
          return project;
        }
      }),
    );

    const currentState = vercelConnection.get();
    updateVercelConnection({
      ...currentState,
      stats: {
        projects: projectsWithDeployments,
        totalProjects: projectsWithDeployments.length,
      },
    });
  } catch (error) {
    console.error('Vercel API Error:', error);
    logStore.logError('Failed to fetch Vercel stats', { error });
    toast.error('Failed to fetch Vercel statistics');
  } finally {
    isFetchingStats.set(false);
  }
}
