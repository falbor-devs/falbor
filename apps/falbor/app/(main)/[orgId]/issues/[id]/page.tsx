import { db } from '~/lib/db';
import { stayupIssues, stayupEvents } from '~/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { IssueDetailView, IssueDetailData } from '~/components/stayup/IssueDetailView';
import { notFound } from 'next/navigation';

export default async function IssuePage({ params }: { params: { id: string } }) {
  
  const issue = await db.query.stayupIssues.findFirst({
    where: eq(stayupIssues.id, params.id)
  });

  if (!issue) {
    notFound();
  }

  const events = await db.query.stayupEvents.findMany({
    where: eq(stayupEvents.issueId, params.id),
    orderBy: [desc(stayupEvents.timestamp)],
    limit: 10
  });

  const issueData: IssueDetailData = {
    id: issue.id,
    title: issue.title,
    message: issue.message,
    status: issue.status,
    severity: issue.severity,
    environment: issue.environment,
    lastSeen: issue.lastSeen,
    aiAnalysis: issue.aiAnalysis,
    events: events.map(e => ({
      id: e.id,
      stacktrace: e.stacktrace,
      browserInfo: e.browserInfo,
      url: e.url,
      timestamp: e.timestamp
    }))
  };

  return <IssueDetailView issue={issueData} />;
}
