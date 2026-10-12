import React from 'react';

export const TEMPLATES = [
  {
    id: 't1',
    name: 'Email Welcome Series',
    description: 'Automatically send a sequence of emails when a user signs up.',
    thumbnailUrl: '/templates/email_workflow_template.png',
    nodes: [
      { id: '1', type: 'triggerNode', position: { x: 250, y: 100 }, data: { label: 'User Signup' } },
      { id: '2', type: 'actionNode', position: { x: 250, y: 250 }, data: { label: 'Send Welcome Email' } },
      { id: '3', type: 'waitNode', position: { x: 250, y: 400 }, data: { label: 'Wait 3 Days' } },
      { id: '4', type: 'actionNode', position: { x: 250, y: 550 }, data: { label: 'Send Follow-up Email' } },
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2' },
      { id: 'e2-3', source: '2', target: '3' },
      { id: 'e3-4', source: '3', target: '4' },
    ]
  },
  {
    id: 't2',
    name: 'Weekly DB Cleanup',
    description: 'Run a weekly background job to clean up stale records.',
    thumbnailUrl: '/templates/db_cleanup_template.png',
    nodes: [
      { id: '1', type: 'triggerNode', position: { x: 250, y: 100 }, data: { label: 'Schedule: Weekly' } },
      { id: '2', type: 'codeExecuteNode', position: { x: 250, y: 250 }, data: { label: 'Run SQL Cleanup' } },
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2' },
    ]
  },
  {
    id: 't3',
    name: 'Customer Onboarding',
    description: 'Set up new customers with accounts and send welcome materials.',
    thumbnailUrl: '/templates/onboarding_template.png',
    nodes: [
      { id: '1', type: 'triggerNode', position: { x: 250, y: 100 }, data: { label: 'New Customer' } },
      { id: '2', type: 'httpRequestNode', position: { x: 250, y: 250 }, data: { label: 'Create Account in CRM' } },
      { id: '3', type: 'actionNode', position: { x: 250, y: 400 }, data: { label: 'Send Welcome Kit' } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2' },
      { id: 'e2-3', source: '2', target: '3' }
    ]
  },
  {
    id: 't4',
    name: 'Payment Failure Recovery',
    description: 'Automatically retry failed payments and notify the user.',
    thumbnailUrl: '/templates/payment_recovery_template.png',
    nodes: [
      { id: '1', type: 'triggerNode', position: { x: 250, y: 100 }, data: { label: 'Payment Failed' } },
      { id: '2', type: 'waitNode', position: { x: 250, y: 250 }, data: { label: 'Wait 24 Hours' } },
      { id: '3', type: 'httpRequestNode', position: { x: 250, y: 400 }, data: { label: 'Retry Payment' } },
      { id: '4', type: 'conditionNode', position: { x: 250, y: 550 }, data: { label: 'Check Success' } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2' },
      { id: 'e2-3', source: '2', target: '3' },
      { id: 'e3-4', source: '3', target: '4' }
    ]
  },
  {
    id: 't5',
    name: 'Lead Scoring',
    description: 'Evaluate new leads and route them to the sales team.',
    thumbnailUrl: '/templates/lead_scoring_template.png',
    nodes: [
      { id: '1', type: 'triggerNode', position: { x: 250, y: 100 }, data: { label: 'New Lead' } },
      { id: '2', type: 'codeExecuteNode', position: { x: 250, y: 250 }, data: { label: 'Calculate Score' } },
      { id: '3', type: 'conditionNode', position: { x: 250, y: 400 }, data: { label: 'Score > 80?' } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2' },
      { id: 'e2-3', source: '2', target: '3' }
    ]
  },
  {
    id: 't6',
    name: 'Social Media Auto-Poster',
    description: 'Publish blog posts to Twitter and LinkedIn automatically.',
    thumbnailUrl: '/templates/social_media_template.png',
    nodes: [
      { id: '1', type: 'triggerNode', position: { x: 250, y: 100 }, data: { label: 'Blog Published' } },
      { id: '2', type: 'httpRequestNode', position: { x: 250, y: 250 }, data: { label: 'Post to Twitter' } },
      { id: '3', type: 'httpRequestNode', position: { x: 250, y: 400 }, data: { label: 'Post to LinkedIn' } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2' },
      { id: 'e2-3', source: '2', target: '3' }
    ]
  }
];

export type TemplateType = typeof TEMPLATES[0];

interface WorkflowTemplatesProps {
  creatingTemplate: string | null;
  onUseTemplate: (template: TemplateType) => void;
}

export function WorkflowTemplates({ creatingTemplate, onUseTemplate }: WorkflowTemplatesProps) {
  return (
    <div className="">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-0 border-b-0 border-y border-falbor-elements-borderColor">
        {TEMPLATES.map(template => (
          <div
            key={template.id}
            onClick={() => !creatingTemplate && onUseTemplate(template)}
            className="group flex flex-col bg-falbor-elements-background-depth-1 border-r border-b border-falbor-elements-borderColor overflow-hidden hover:bg-falbor-elements-background-depth-2 transition-all cursor-pointer relative rounded-none"
          >
            {}
            <div className="w-full aspect-square bg-falbor-elements-background-depth-3 flex items-center justify-center border-b border-falbor-elements-borderColor relative overflow-hidden group-hover:opacity-90 transition-opacity">
              {template.thumbnailUrl ? (
                <img 
                  src={template.thumbnailUrl} 
                  alt={template.name}
                  className="w-full h-full object-cover opacity-90"
                />
              ) : (
                <div className="i-ph:magic-wand text-6xl text-falbor-elements-textTertiary opacity-50 group-hover:scale-110 group-hover:text-accent-500 transition-all duration-500" />
              )}
            </div>

            {}
            <div className="p-6 flex flex-col flex-1">
              <h3 className="font-semibold text-xl text-falbor-elements-textPrimary mb-2">{template.name}</h3>
              <p className="text-base text-falbor-elements-textSecondary line-clamp-2 mb-6 flex-1">
                {template.description}
              </p>

              <div className="flex justify-end mt-auto pt-4">
                <button
                  disabled={creatingTemplate === template.id}
                  className="w-10 h-10 rounded-full bg-falbor-elements-textPrimary text-falbor-elements-background-depth-1 flex items-center justify-center hover:scale-110 transition-transform"
                >
                  {creatingTemplate === template.id ? (
                    <div className="i-svg-spinners:90-ring-with-bg text-base" />
                  ) : (
                    <div className="i-ph:arrow-right-bold text-base" />
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
