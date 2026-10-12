export interface DocItem {
  slug: string
  title: string
  category: string
  href: string
}

export const DOCS_CONFIG: DocItem[] = [
  { slug: 'builder', title: 'Website Builder', category: 'Documentation', href: '/builder' },
  { slug: 'database', title: 'Database', category: 'Documentation', href: '/database' },
  { slug: 'organizations', title: 'Organizations', category: 'Documentation', href: '/organizations' },
  { slug: 'workflow', title: 'Workflow', category: 'Documentation', href: '/workflow' },
  { slug: 'darknet', title: 'Darknet', category: 'Documentation', href: '/darknet' },
  { slug: 'chat', title: 'Chat', category: 'Documentation', href: '/chat' },
  { slug: 'models', title: 'Models', category: 'Documentation', href: '/models' },
  { slug: 'stayup', title: 'Stayup', category: 'Documentation', href: '/stayup' },
  { slug: 'cli', title: 'Command Line Interface', category: 'CLI', href: '/cli' },
  { slug: 'api-reference', title: 'API Reference', category: 'API', href: '/api-reference' },
  { slug: 'mcp', title: 'Model Context Protocol (MCP)', category: 'Integrations', href: '/mcp' },
  { slug: 'academy', title: 'Academy', category: 'Resources', href: '/academy' },
]
