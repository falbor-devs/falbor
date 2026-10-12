import React from 'react';
import { useRouter } from 'next/navigation';
import type { InvestigationState } from '~/lib/sources/types';
import { Card } from '~/components/ui/Card';
import { Badge } from '~/components/ui/Badge';

interface SavedInvestigation {
  id: string;
  query: string;
  state: InvestigationState;
  createdAt: string;
}

export function SourcesHistoryGrid({ history }: { history: SavedInvestigation[] }) {
  const router = useRouter();

  if (!history || history.length === 0) {
    return null; 
  }

  return (
    <div className="w-full max-w-4xl mt-6">
      <h3 className="px-3 text-xl font-semibold mb-6 text-falbor-elements-textPrimary">Previous Investigations</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {history.map((inv) => (
          <Card
            key={inv.id}
            onClick={() => router.push(`/sources/${inv.id}`)}
            className="group cursor-pointer hover:border-falbor-elements-borderColorActive transition-all p-5 flex flex-col justify-between"
          >
            <div>
              <div className="text-falbor-elements-textPrimary font-semibold mb-3 line-clamp-2 leading-tight group-hover:text-falbor-elements-textActive transition-colors" title={inv.query}>
                {inv.query}
              </div>
              <div className="text-sm text-falbor-elements-textSecondary mb-4 flex items-center justify-between">
                <span>{new Date(inv.createdAt).toLocaleDateString()}</span>
                {inv.state.phase === 'complete' ? (
                  <Badge variant="success">Complete</Badge>
                ) : (
                  <Badge variant="warning">{inv.state.phase}</Badge>
                )}
              </div>
            </div>
            <div className="text-xs text-falbor-elements-textTertiary flex gap-4 border-t border-falbor-elements-borderColor pt-3 mt-auto">
              <span><strong>{inv.state.rawResultCount || 0}</strong> hits</span>
              <span><strong>{inv.state.scrapedResults?.length || 0}</strong> scraped</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
