'use client';
import React from 'react';
import Link from 'next/link';
import { Card } from '~/components/ui/Card';
import { Badge } from '~/components/ui/Badge';
import { StatusIndicator } from '~/components/ui/StatusIndicator';

export interface IssueData {
  id: string;
  title: string;
  fingerprint: string;
  environment: string | null;
  eventCount: number;
  lastSeen: Date;
  severity: string;
  status: string;
}

interface IssuesTableProps {
  issues: IssueData[];
  orgId: string;
}

export function IssuesTable({ issues, orgId }: IssuesTableProps) {
  if (issues.length === 0) {
    return (
      <Card className="p-12 flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-falbor-elements-background-depth-2 flex items-center justify-center mb-4">
          <div className="i-ph:check-circle text-green-500 w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold">No Issues Found</h3>
        <p className="text-falbor-elements-textSecondary mt-2">Your applications are running perfectly.</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-falbor-elements-textSecondary">
          <thead className="bg-falbor-elements-background-depth-2 border-b border-falbor-elements-borderColor">
            <tr>
              <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Issue</th>
              <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Environment</th>
              <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Events</th>
              <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Last Seen</th>
              <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-falbor-elements-borderColor">
            {issues.map((issue) => (
              <tr key={issue.id} className="hover:bg-falbor-elements-background-depth-2 transition-colors group">
                <td className="px-6 py-4">
                  <Link href={`/${orgId}/issues/${issue.id}`} className="block">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <StatusIndicator 
                          status={issue.severity === 'critical' ? 'error' : issue.severity === 'error' ? 'warning' : 'info'} 
                          size="sm" 
                        />
                      </div>
                      <div>
                        <p className="font-semibold text-falbor-elements-textPrimary group-hover:text-blue-500 transition-colors line-clamp-1">
                          {issue.title}
                        </p>
                        <p className="text-xs text-falbor-elements-textSecondary mt-1 font-mono">{issue.fingerprint}</p>
                      </div>
                    </div>
                  </Link>
                </td>
                <td className="px-6 py-4">
                  <Badge variant="subtle">{issue.environment || 'production'}</Badge>
                </td>
                <td className="px-6 py-4 font-mono text-falbor-elements-textPrimary">
                  {issue.eventCount}
                </td>
                <td className="px-6 py-4 text-xs whitespace-nowrap">
                  {new Date(issue.lastSeen).toLocaleString()}
                </td>
                <td className="px-6 py-4">
                  {issue.status === 'unresolved' ? (
                    <Badge variant="warning">Unresolved</Badge>
                  ) : (
                    <Badge variant="success">Resolved</Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
