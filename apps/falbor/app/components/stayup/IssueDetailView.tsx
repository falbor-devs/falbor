'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '~/components/ui/Card';
import { Button } from '~/components/ui/Button';
import { Badge } from '~/components/ui/Badge';

export interface IssueEventData {
  id: string;
  stacktrace: string | null;
  browserInfo: any;
  url: string | null;
  timestamp: Date;
}

export interface IssueDetailData {
  id: string;
  title: string;
  message: string | null;
  status: string;
  severity: string;
  environment: string | null;
  lastSeen: Date;
  aiAnalysis: any; 
  events: IssueEventData[];
}

interface IssueDetailViewProps {
  issue: IssueDetailData;
}

export function IssueDetailView({ issue }: IssueDetailViewProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [aiData, setAiData] = useState<any>(issue.aiAnalysis);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch(`/api/stayup/analyze/${issue.id}`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setAiData(data.analysis);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyzing(false);
    }
  };

  const latestEvent = issue.events[0];

  return (
    <div className="pb-20">
      <div className="mb-6">
        <Link href="/issues" className="text-sm font-medium text-falbor-elements-textSecondary hover:text-falbor-elements-textPrimary flex items-center gap-1">
          <div className="i-ph:arrow-left w-4 h-4" />
          Back to Issues
        </Link>
      </div>

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Badge variant={issue.severity === 'critical' ? 'danger' : 'warning'}>
              {issue.severity.toUpperCase()}
            </Badge>
            <Badge variant="subtle">
              {issue.environment || 'production'}
            </Badge>
            <span className="text-sm text-falbor-elements-textSecondary flex items-center gap-1">
              <div className="i-ph:clock w-4 h-4" />
              Last seen {new Date(issue.lastSeen).toLocaleString()}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-falbor-elements-textPrimary break-all leading-tight">
            {issue.title}
          </h1>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <Button variant="outline" className="gap-2">
            <div className="i-ph:check-circle w-4 h-4" />
            Mark Resolved
          </Button>
          {!aiData && (
            <Button 
              onClick={handleAnalyze}
              disabled={analyzing}
              variant="default"
              className="gap-2 bg-purple-600 hover:bg-purple-700 text-white border-none"
            >
              {analyzing ? (
                <div className="i-ph:spinner animate-spin w-4 h-4" />
              ) : (
                <div className="i-ph:magic-wand w-4 h-4" />
              )}
              {analyzing ? 'Analyzing...' : 'Analyze with AI'}
            </Button>
          )}
        </div>
      </div>

      {aiData && (
        <Card className="mb-8 border-purple-500/30 bg-purple-500/5 shadow-inner">
          <CardHeader className="border-b border-purple-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center">
                <div className="i-ph:sparkle-fill text-white w-4 h-4" />
              </div>
              <CardTitle className="text-lg text-purple-900 dark:text-purple-100">
                {aiData.title || "AI Diagnosis"}
              </CardTitle>
            </div>
            
            <div className="flex items-center gap-3 text-sm">
              <span className="text-falbor-elements-textSecondary">Confidence:</span>
              <Badge variant={
                aiData.confidenceLevel === 'High' ? 'success' : 
                aiData.confidenceLevel === 'Medium' ? 'warning' : 'danger'
              }>
                {aiData.confidenceLevel}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-purple-800 dark:text-purple-300 mb-2 flex items-center gap-2">
                    <div className="i-ph:info w-4 h-4" />
                    Explanation
                  </h3>
                  <p className="text-falbor-elements-textPrimary text-sm leading-relaxed">
                    {aiData.explanation}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-red-700 dark:text-red-400 mb-2 flex items-center gap-2">
                    <div className="i-ph:warning w-4 h-4" />
                    Probable Root Cause
                  </h3>
                  <p className="text-falbor-elements-textPrimary text-sm leading-relaxed">
                    {aiData.rootCause}
                  </p>
                  {aiData.affectedComponent && (
                    <div className="mt-2 text-xs">
                      <span className="font-semibold text-falbor-elements-textSecondary">Affected Component: </span>
                      <code className="bg-falbor-elements-background-depth-2 px-1.5 py-0.5 rounded text-red-400">
                        {aiData.affectedComponent}
                      </code>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 mb-2 flex items-center gap-2">
                    <div className="i-ph:magnifying-glass w-4 h-4" />
                    Evidence
                  </h3>
                  <p className="text-falbor-elements-textSecondary text-sm italic">
                    {aiData.evidence}
                  </p>
                </div>
              </div>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-green-700 dark:text-green-400 mb-2 flex items-center gap-2">
                    <div className="i-ph:wrench w-4 h-4" />
                    Recommended Fix
                  </h3>
                  <p className="text-falbor-elements-textPrimary text-sm leading-relaxed mb-3">
                    {aiData.recommendedFix}
                  </p>
                  
                  {aiData.stepByStepInstructions && aiData.stepByStepInstructions.length > 0 && (
                    <div className="bg-falbor-elements-background-depth-2/50 rounded-lg p-4 border border-falbor-elements-borderColor">
                      <ol className="list-decimal list-inside space-y-2 text-sm text-falbor-elements-textSecondary">
                        {aiData.stepByStepInstructions.map((step: string, i: number) => (
                          <li key={i} className="pl-2">{step}</li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
                
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-blue-500 dark:text-blue-400 mb-2 flex items-center gap-2">
                    <div className="i-ph:robot w-4 h-4" />
                    Prompt for AI Agent
                  </h3>
                  <div className="bg-gray-900 rounded-lg p-4 relative group border border-gray-700">
                    <p className="text-gray-300 text-sm font-mono leading-relaxed whitespace-pre-wrap mb-10">
                      {aiData.aiPrompt}
                    </p>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(aiData.aiPrompt);
                        alert("Prompt copied to clipboard!");
                      }}
                      className="absolute bottom-3 right-3 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-all"
                    >
                      <div className="i-ph:copy w-4 h-4" />
                      Copy Fix Prompt
                    </button>
                  </div>
                </div>
                
                {}
                <div className="mt-6 border-t border-purple-500/20 pt-6">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400 mb-2 flex items-center gap-2">
                    <div className="i-ph:chat-teardrop-text w-4 h-4" />
                    Ask AI
                  </h3>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Ask a follow-up question about this issue..." 
                      className="flex-1 bg-falbor-elements-background-depth-1 border border-falbor-elements-borderColor rounded-md px-3 py-2 text-sm text-falbor-elements-textPrimary focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                    <Button variant="default" className="bg-purple-600 hover:bg-purple-700 text-white border-none gap-2">
                      <div className="i-ph:paper-plane-right w-4 h-4" />
                      Ask
                    </Button>
                  </div>
                  <p className="text-xs text-falbor-elements-textSecondary mt-2">
                    The AI will answer using the stack trace, root cause, and recent events as context.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="border-b border-falbor-elements-borderColor">
              <CardTitle className="text-base">Stacktrace</CardTitle>
            </CardHeader>
            <div className="p-0 overflow-x-auto bg-[#0d1117] rounded-b-lg">
              <pre className="text-xs p-6 font-mono text-red-400 whitespace-pre-wrap leading-relaxed">
                {latestEvent?.stacktrace || 'No stacktrace available.'}
              </pre>
            </div>
          </Card>
        </div>
        
        <div className="space-y-6">
          <Card>
            <CardHeader className="border-b border-falbor-elements-borderColor">
              <CardTitle className="text-base">Event Context</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div>
                <span className="block text-xs font-medium text-falbor-elements-textSecondary uppercase mb-1">URL</span>
                <span className="text-sm text-falbor-elements-textPrimary break-all">{latestEvent?.url || 'N/A'}</span>
              </div>
              <div>
                <span className="block text-xs font-medium text-falbor-elements-textSecondary uppercase mb-1">Browser</span>
                <span className="text-sm text-falbor-elements-textPrimary break-words">
                  {latestEvent?.browserInfo ? JSON.stringify(latestEvent.browserInfo) : 'N/A'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
