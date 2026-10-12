import { map } from 'nanostores';

export type DeploymentInfo = {
  chatId: string;
  url: string;
  provider: 'falbor' | 'vercel' | 'netlify' | 'github' | 'gitlab';
  subdomain?: string;
  createdAt?: string;
  updatedAt?: string;
};

export const deploymentStore = map<{ current: DeploymentInfo | null }>({
  current: null,
});

export async function fetchDeployment(chatId: string) {
  try {
    const res = await fetch(`/api/deployments?chatId=${chatId}`);
    if (res.ok) {
      const data = await res.json();
      deploymentStore.set({ current: data });
    } else {
      deploymentStore.set({ current: null });
    }
  } catch (error) {
    console.error('Failed to fetch deployment', error);
  }
}

export async function deleteDeployment(chatId: string) {
  try {
    await fetch(`/api/deployments?chatId=${chatId}`, { method: 'DELETE' });
    deploymentStore.set({ current: null });
  } catch (error) {
    console.error('Failed to delete deployment', error);
  }
}
