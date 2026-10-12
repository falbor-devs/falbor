'use client';
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '~/components/ui/Card';
import { Button } from '~/components/ui/Button';

export function DemoModeWidget({ projectId, apiKey }: { projectId: string, apiKey: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const simulateEvent = async (type: string) => {
    setSending(true);
    try {
      let eventPayload: any = {};
      
      if (type === 'critical_production') {
        eventPayload = {
          message: "Uncaught ReferenceError: PaymentProcessor is not defined",
          severity: "critical",
          environment: "production",
          fingerprint: "payment-processor-ref-error",
          stacktrace: "ReferenceError: PaymentProcessor is not defined\n    at CheckoutComponent (checkout.tsx:45)\n    at renderComponent (react-dom.js:123)",
          url: "https://example.com/checkout",
        };
      } else if (type === 'api_failure') {
        eventPayload = {
          message: "API Error 500: Internal Server Error on /api/users/sync",
          severity: "error",
          environment: "production",
          fingerprint: "api-500-users-sync",
          stacktrace: "FetchError: 500 Internal Server Error\n    at fetchUsers (api.ts:22)",
          url: "https://example.com/dashboard",
        };
      } else if (type === 'warning_loop') {
        eventPayload = {
          message: "DeprecationWarning: Component Lifecycle methods are deprecated",
          severity: "warning",
          environment: "development",
          fingerprint: "dep-warn-lifecycle",
          stacktrace: "Warning: Component Lifecycle methods are deprecated\n    at LegacyWidget (widget.js:12)",
        };
      }

      
      await fetch('/api/stayup/ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          projectId: projectId,
          environment: eventPayload.environment,
          events: [
            {
              ...eventPayload,
              timestamp: new Date().toISOString(),
              browserInfo: {
                userAgent: navigator.userAgent,
                language: navigator.language
              }
            }
          ]
        })
      });

      alert(`Simulated ${type} event successfully!`);
    } catch (error) {
      console.error(error);
      alert("Failed to simulate event. Make sure you have an active project.");
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 p-4 rounded-full bg-indigo-600 text-white shadow-xl hover:bg-indigo-700 transition-all z-50 flex items-center justify-center"
        title="Open Demo Mode"
      >
        <div className="i-ph:flask-fill w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-80 z-50 animate-in fade-in slide-in-from-bottom-4">
      <Card className="border-indigo-500/30 shadow-2xl bg-white/95 dark:bg-[#111114]/95 backdrop-blur-md">
        <CardHeader className="border-b border-falbor-elements-borderColor pb-3 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="i-ph:flask-fill text-indigo-500 w-5 h-5" />
            <CardTitle className="text-sm">Demo Simulator</CardTitle>
          </div>
          <button onClick={() => setIsOpen(false)} className="text-falbor-elements-textSecondary hover:text-falbor-elements-textPrimary">
            <div className="i-ph:x w-4 h-4" />
          </button>
        </CardHeader>
        <CardContent className="pt-4 space-y-3">
          <p className="text-xs text-falbor-elements-textSecondary mb-2">
            Trigger simulated telemetry events to test real-time ingestion, AI analysis, and notifications.
          </p>
          <Button 
            disabled={sending}
            onClick={() => simulateEvent('critical_production')}
            className="w-full justify-start gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20"
          >
            <div className="i-ph:warning-circle-fill w-4 h-4" />
            Critical Prod Error
          </Button>
          <Button 
            disabled={sending}
            onClick={() => simulateEvent('api_failure')}
            className="w-full justify-start gap-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/20"
          >
            <div className="i-ph:plugs-connected-fill w-4 h-4" />
            API 500 Failure
          </Button>
          <Button 
            disabled={sending}
            onClick={() => simulateEvent('warning_loop')}
            className="w-full justify-start gap-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20"
          >
            <div className="i-ph:arrows-clockwise-fill w-4 h-4" />
            Warning Loop
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
