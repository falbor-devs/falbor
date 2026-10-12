import { db } from '~/lib/db';
import { stayupIssues, stayupProjects, stayupEvents, stayupHealthScans } from '~/lib/db/schema';
import { eq, sql, desc } from 'drizzle-orm';
import { DashboardMetrics } from '~/components/stayup/DashboardMetrics';
import { HealthScanCard } from '~/components/stayup/HealthScanCard';
import { Button } from '~/components/ui/Button';
import { AutoRefresh } from '~/components/stayup/AutoRefresh';
import { ActivityChart } from '~/components/stayup/ActivityChart';
import { cookies } from 'next/headers';
import { verifyToken } from '~/lib/auth';
import { inArray, and } from 'drizzle-orm';
import { notFound } from 'next/navigation';

export default async function DashboardOverview({ params }: { params: { orgId: string } }) {
  const token = cookies().get('session')?.value;
  const payload = token ? await verifyToken(token) : null;
  const userId = payload?.userId;

  if (!userId) {
    return <div>Unauthorized. Please log in.</div>;
  }

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(params.orgId);
  if (!isUUID) {
    notFound();
  }

  
  const organization = await db.query.stayupProjects.findFirst({
    where: and(
      eq(stayupProjects.id, params.orgId),
      eq(stayupProjects.userId, userId)
    )
  });

  if (!organization) {
    return <div>Organization not found or you do not have access.</div>;
  }

  
  const projectIds = [organization.id];
  const activeProjects = 1;

  
  let totalEvents = 0;
  let unresolvedIssues = 0;
  let recentEvents: any[] = [];

  if (projectIds.length > 0) {
    const eventsResult = await db.select({ count: sql<number>`count(*)` })
      .from(stayupEvents)
      .where(inArray(stayupEvents.projectId, projectIds));
    totalEvents = Number(eventsResult[0]?.count || 0);

    const unresolvedResult = await db.select({ count: sql<number>`count(*)` })
      .from(stayupIssues)
      .where(and(
        inArray(stayupIssues.projectId, projectIds),
        eq(stayupIssues.status, 'unresolved')
      ));
    unresolvedIssues = Number(unresolvedResult[0]?.count || 0);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    recentEvents = await db.query.stayupEvents.findMany({
      where: and(
        inArray(stayupEvents.projectId, projectIds)
      ),
      columns: { timestamp: true }
    });
  }

  let latestScan = null;
  if (organization) {
    const scanResult = await db.query.stayupHealthScans.findFirst({
      where: eq(stayupHealthScans.projectId, organization.id),
      orderBy: [desc(stayupHealthScans.createdAt)]
    });

    if (scanResult) {
      latestScan = {
        id: scanResult.id,
        summary: scanResult.summary,
        status: scanResult.status,
        details: scanResult.details as any,
        createdAt: scanResult.createdAt
      };
    }
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out pb-12">
      <AutoRefresh interval={3000} />
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-falbor-elements-textPrimary">Overview</h1>
          <p className="text-falbor-elements-textSecondary mt-1">Real-time metrics and recent activity for your projects.</p>
        </div>
      </div>

      <DashboardMetrics
        totalErrors={totalEvents}
        unresolvedIssues={unresolvedIssues}
        activeProjects={activeProjects}
      />

      {organization && (
        <HealthScanCard projectId={organization.id} initialScan={latestScan} />
      )}

      <ActivityChart events={recentEvents} />
    </div>
  );
}