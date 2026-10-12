'use client';
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '~/components/ui/Card';
import { Button } from '~/components/ui/Button';
import { Badge } from '~/components/ui/Badge';

interface HealthScanData {
  id?: string;
  summary: string;
  status: string;
  details: {
    trends?: string;
    topConcerns?: string[];
    recommendations?: string[];
  };
  createdAt: Date;
}

interface HealthScanCardProps {
  projectId: string;
  initialScan: HealthScanData | null;
}

export function HealthScanCard({ projectId, initialScan }: HealthScanCardProps) {
  const [scan, setScan] = useState<HealthScanData | null>(initialScan);
  const [scanning, setScanning] = useState(false);

  const handleScan = async () => {
    setScanning(true);
    try {
      const res = await fetch('/api/stayup/health-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId })
      });
      const data = await res.json();
      if (data.success) {
        setScan({
          ...data.scan,
          createdAt: new Date(data.scan.createdAt)
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setScanning(false);
    }
  };

  return (
    <Card className="mb-8">
      <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-blue-500/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
            <div className="i-ph:heartbeat text-blue-500 w-4 h-4" />
          </div>
          <CardTitle className="text-lg">AI Health Scan</CardTitle>
        </div>
        <Button
          onClick={handleScan}
          disabled={scanning}
          variant="outline"
          size="sm"
          className="border-blue-500/30 text-blue-600 hover:bg-blue-500/10"
        >
          {scanning ? (
            <><div className="i-ph:spinner animate-spin w-4 h-4 mr-2" /> Scanning...</>
          ) : (
            <><div className="i-ph:arrows-clockwise w-4 h-4 mr-2" /> Run Scan</>
          )}
        </Button>
      </CardHeader>

      <CardContent className="pt-6">
        {!scan ? (
          <div className="text-center py-6 text-falbor-elements-textSecondary">
            <div className="i-ph:stethoscope w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No health scan runs yet. Click Run Scan to analyze your project's telemetry data.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Badge variant={scan.status === 'healthy' ? 'success' : scan.status === 'warning' ? 'warning' : 'danger'} size="lg">
                {scan.status.toUpperCase()}
              </Badge>
              <h3 className="text-xl font-medium text-falbor-elements-textPrimary">{scan.summary}</h3>
            </div>

            {scan.details.trends && (
              <div className="bg-falbor-elements-background-depth-1 p-4 rounded-lg border border-falbor-elements-borderColor">
                <h4 className="text-sm font-semibold uppercase text-falbor-elements-textSecondary mb-2 flex items-center gap-2">
                  <div className="i-ph:trend-up w-4 h-4" /> Emerging Trends
                </h4>
                <p className="text-sm text-falbor-elements-textPrimary">{scan.details.trends}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {scan.details.topConcerns && scan.details.topConcerns.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold uppercase text-red-500 mb-2 flex items-center gap-2">
                    <div className="i-ph:warning-circle w-4 h-4" /> Top Concerns
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-falbor-elements-textPrimary">
                    {scan.details.topConcerns.map((c, i) => <li key={i}>{c}</li>)}
                  </ul>
                </div>
              )}

              {scan.details.recommendations && scan.details.recommendations.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold uppercase text-green-500 mb-2 flex items-center gap-2">
                    <div className="i-ph:check-circle w-4 h-4" /> Recommendations
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-falbor-elements-textPrimary">
                    {scan.details.recommendations.map((c, i) => <li key={i}>{c}</li>)}
                  </ul>
                </div>
              )}
            </div>

            <div className="text-xs text-falbor-elements-textSecondary text-right">
              Last scanned: {new Date(scan.createdAt).toLocaleString()}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
