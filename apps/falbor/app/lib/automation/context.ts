import { db } from '~/lib/db';
import type { ProductContext } from './types';

function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function arr(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      if (item && typeof item === 'object' && typeof (item as any).name === 'string') return String((item as any).name).trim();
      return '';
    })
    .filter(Boolean);
}

function withProtocol(domain: string | null): string | null {
  if (!domain) return null;
  if (/^https?:\/\//i.test(domain)) return domain;
  return `https://${domain}`;
}

export async function loadProductContext(workspaceId: string): Promise<ProductContext> {
  const workspace = await db.query.workspaces.findFirst({
    where: (w, { eq }) => eq(w.id, workspaceId),
  });
  if (!workspace) throw new Error('Workspace not found');

  const profile = await db.query.workspaceProductProfiles.findFirst({
    where: (p, { eq }) => eq(p.workspaceId, workspaceId),
  });

  const intel = (workspace.intelligenceData as any) || {};
  const positioningDetails = intel.positioningDetails || {};

  const productName =
    str(profile?.productName) ||
    str(positioningDetails.productName) ||
    (workspace.name && workspace.name !== 'Untitled Workspace' ? workspace.name.trim() : null) ||
    'Unnamed product';

  const description =
    str(profile?.summary) ||
    str(intel.summary) ||
    str(intel.description) ||
    str(workspace.contextPrompt)?.slice(0, 800) ||
    null;

  const problem = str(profile?.problem) || str(intel.mainProblem) || null;
  const category = str(profile?.category) || str(positioningDetails.category) || str(intel.category) || null;
  const positioning = str(profile?.positioning) || str(intel.positioning) || null;
  const pricing = str(profile?.pricing) || str(intel.pricing) || null;
  const targetAudience = str(profile?.icp) || str(intel.targetAudience) || str(positioningDetails.audience) || null;
  const websiteUrl = withProtocol(str(profile?.domain) || str(workspace.domain));

  const useCases = arr(profile?.useCases).length ? arr(profile?.useCases) : arr(intel.useCases);
  const features = arr(profile?.features).length ? arr(profile?.features) : arr(intel.keyFeatures).length ? arr(intel.keyFeatures) : arr(intel.features);
  const competitors = arr(profile?.knownCompetitors).length ? arr(profile?.knownCompetitors) : arr(intel.competitors);
  const keywords = arr(intel.keywords).length ? arr(intel.keywords) : arr(intel.seoKeywords);

  const missing: string[] = [];
  if (!description) missing.push('description');
  if (!problem) missing.push('problem');
  if (!targetAudience) missing.push('targetAudience');
  if (!useCases.length) missing.push('useCases');
  if (!features.length) missing.push('features');
  if (!competitors.length) missing.push('competitors');

  return {
    workspaceId,
    workspaceName: workspace.name || 'Untitled Workspace',
    productName,
    websiteUrl,
    description,
    category,
    problem,
    positioning,
    pricing,
    targetAudience,
    useCases: useCases.slice(0, 12),
    features: features.slice(0, 20),
    competitors: competitors.slice(0, 10),
    keywords: keywords.slice(0, 15),
    missing,
  };
}
