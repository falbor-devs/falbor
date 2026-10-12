import { db } from '~/lib/db';
import { stayupIssues } from '~/lib/db/schema';
import { desc } from 'drizzle-orm';
import { IssuesTable } from '~/components/stayup/IssuesTable';
import { Button } from '~/components/ui/Button';
import { SearchInput } from '~/components/ui/SearchInput';
import { AutoRefresh } from '~/components/stayup/AutoRefresh';
import { cookies } from 'next/headers';
import { verifyToken } from '~/lib/auth';
import { inArray, and, eq } from 'drizzle-orm';
import { stayupProjects } from '~/lib/db/schema';


export default async function IssuesPage({ params }: { params: { orgId: string } }) {
  const token = cookies().get('session')?.value;
  const payload = token ? await verifyToken(token) : null;
  const userId = payload?.userId;

  if (!userId) {
    return <div>Unauthorized. Please log in.</div>;
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

  let rawIssues: any[] = [];
  if (projectIds.length > 0) {
    rawIssues = await db.query.stayupIssues.findMany({
      where: inArray(stayupIssues.projectId, projectIds),
      orderBy: [desc(stayupIssues.lastSeen)]
    });
  }

  const issues = rawIssues.map(issue => ({
    id: issue.id,
    title: issue.title,
    fingerprint: issue.fingerprint,
    environment: issue.environment,
    eventCount: issue.eventCount,
    lastSeen: issue.lastSeen,
    severity: issue.severity,
    status: issue.status
  }));

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <AutoRefresh interval={3000} />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-falbor-elements-textPrimary">Issues</h1>
          <p className="text-falbor-elements-textSecondary mt-1">Review, analyze, and resolve application errors.</p>
        </div>
        <div className="flex items-center gap-3">
          <SearchInput placeholder="Search issues..." className="w-64" />
        </div>
      </div>

      <IssuesTable issues={issues} orgId={params.orgId} />
    </div>
  );
}
