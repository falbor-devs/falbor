export type ConnectionMethod = 'oauth' | 'api_key';

export interface ConnectorField {
  id: string;
  label: string;
  type: 'text' | 'password';
  placeholder?: string;
}

export interface MCPConnector {
  id: string;
  name: string;
  description: string;
  logo: string;
  method: ConnectionMethod;
  fields?: ConnectorField[];
  docsUrl: string;
  termsUrl: string;
  isNativeTab?: boolean;
}

export const MCP_CONNECTORS: MCPConnector[] = [
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Connect your Stripe account to manage payments, subscriptions, and customers.',
    logo: '/icons/connectors/chatIconns/stripe.svg',
    method: 'oauth',
    docsUrl: 'https://docs.stripe.com',
    termsUrl: 'https://stripe.com/legal',
  },
  {
    id: 'gmail',
    name: 'Gmail',
    description: 'Connect Gmail to read, send, and manage your emails.',
    logo: '/icons/connectors/chatIconns/gmail.png',
    method: 'oauth',
    docsUrl: 'https://developers.google.com/gmail/api/guides',
    termsUrl: 'https://policies.google.com/terms',
  },
  {
    id: 'google-contacts',
    name: 'Google Contacts',
    description: 'Connect Google Contacts to import and manage your contacts.',
    logo: '/icons/connectors/chatIconns/google_contact.png',
    method: 'oauth',
    docsUrl: 'https://developers.google.com/people',
    termsUrl: 'https://policies.google.com/terms',
  },
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    description: 'Connect Google Calendar to import event attendees and schedule meetings.',
    logo: '/icons/connectors/chatIconns/google_calendar.png',
    method: 'oauth',
    docsUrl: 'https://developers.google.com/calendar',
    termsUrl: 'https://policies.google.com/terms',
  },
  {
    id: 'outlook',
    name: 'Outlook',
    description: 'Connect Outlook to read, send, and manage your emails.',
    logo: '/icons/connectors/chatIconns/outlook.png',
    method: 'oauth',
    docsUrl: 'https://learn.microsoft.com/en-us/graph/outlook-mail-concept-overview',
    termsUrl: 'https://www.microsoft.com/en-us/legal/terms-of-use',
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Connect Slack to read and send messages in your workspace.',
    logo: '/icons/connectors/chatIconns/slack.png',
    method: 'oauth',
    docsUrl: 'https://api.slack.com/docs',
    termsUrl: 'https://slack.com/terms-of-service',
  },
  {
    id: 'discord',
    name: 'Discord (User)',
    description: 'Connect your personal Discord account to read servers and profile data.',
    logo: '/icons/connectors/discord.svg', // Assumes there will be a discord.svg or it handles missing
    method: 'oauth',
    docsUrl: 'https://discord.com/developers/docs/intro',
    termsUrl: 'https://discord.com/terms',
  },
  {
    id: 'miro',
    name: 'Miro',
    description: 'Connect your Miro account to create and manage boards, diagrams, and prototypes.',
    logo: '/icons/connectors/miro.svg',
    method: 'oauth',
    docsUrl: 'https://developers.miro.com/',
    termsUrl: 'https://miro.com/legal/',
  },
  {
    id: 'discord-bot',
    name: 'Discord Bot',
    description: 'Connect a Discord Bot token to allow the AI to send messages to servers and channels.',
    logo: '/icons/connectors/discord.svg',
    method: 'api_key',
    fields: [
      { id: 'bot_token', label: 'Bot Token', type: 'password', placeholder: 'MTIwNjMx...' },
    ],
    docsUrl: 'https://discord.com/developers/docs/intro',
    termsUrl: 'https://discord.com/terms',
  },
  {
    id: 'google-maps',
    name: 'Google Maps',
    description: 'Connect Google Maps for geocoding, directions, and places data.',
    logo: '/icons/connectors/google_maps.svg',
    method: 'api_key',
    fields: [
      { id: 'serverApiKey', label: 'Server API key', type: 'password' },
      { id: 'browserApiKey', label: 'Browser API key', type: 'password' },
    ],
    docsUrl: 'https://developers.google.com/maps/documentation',
    termsUrl: 'https://cloud.google.com/maps-platform/terms',
  },
  {
    id: 'resend',
    name: 'Resend',
    description: 'Connect Resend to send transactional emails.',
    logo: '/icons/connectors/resend.svg',
    method: 'api_key',
    fields: [
      { id: 'apiKey', label: 'API key', type: 'password' },
    ],
    docsUrl: 'https://resend.com/docs',
    termsUrl: 'https://resend.com/legal',
  },
  {
    id: 'twilio',
    name: 'Twilio',
    description: 'Connect Twilio to send SMS and manage communications.',
    logo: '/icons/connectors/twilio.svg',
    method: 'api_key',
    fields: [
      { id: 'accountSid', label: 'Account SID', type: 'text' },
      { id: 'apiKeySid', label: 'Standard API Key SID', type: 'text' },
      { id: 'apiKeySecret', label: 'API Key Secret', type: 'password' },
    ],
    docsUrl: 'https://www.twilio.com/docs',
    termsUrl: 'https://www.twilio.com/legal/tos',
  },
  {
    id: 'firecrawl',
    name: 'Firecrawl',
    description: 'Connect Firecrawl to turn websites into LLM-ready markdown.',
    logo: '/icons/connectors/firecrawl.svg',
    method: 'api_key',
    fields: [
      { id: 'apiKey', label: 'API key', type: 'password' },
    ],
    docsUrl: 'https://docs.firecrawl.dev',
    termsUrl: 'https://firecrawl.dev/terms',
  },
  {
    id: 'telegram',
    name: 'Telegram',
    description: 'Connect Telegram to build and manage bots.',
    logo: '/icons/connectors/telegram.svg',
    method: 'api_key',
    fields: [
      { id: 'bot_token', label: 'Bot token', type: 'password' },
    ],
    docsUrl: 'https://core.telegram.org/bots',
    termsUrl: 'https://telegram.org/tos',
  },
  {
    id: 'klipy',
    name: 'KLIPY',
    description: 'Connect KLIPY for data enrichment and insights.',
    logo: '/icons/connectors/klipy.svg',
    method: 'api_key',
    fields: [
      { id: 'apiKey', label: 'API key', type: 'password' },
    ],
    docsUrl: 'https://docs.klipy.co',
    termsUrl: 'https://klipy.co/terms',
  },
  {
    id: 'bigquery',
    name: 'BigQuery',
    description: 'Connect BigQuery to run analytics on large datasets.',
    logo: '/icons/connectors/bigquery.svg',
    method: 'api_key',
    fields: [
      { id: 'wifAudience', label: 'WIF audience', type: 'text' },
      { id: 'serviceAccountEmail', label: 'Service account email', type: 'text' },
    ],
    docsUrl: 'https://cloud.google.com/bigquery/docs',
    termsUrl: 'https://cloud.google.com/terms',
  },
  {
    id: 'apollo',
    name: 'Apollo.io',
    description: 'Connect Apollo.io for sales intelligence and engagement.',
    logo: '/icons/connectors/apollo.svg',
    method: 'api_key',
    fields: [
      { id: 'apiKey', label: 'API key', type: 'password' },
    ],
    docsUrl: 'https://knowledge.apollo.io/hc/en-us',
    termsUrl: 'https://www.apollo.io/terms-of-service',
  },
  {
    id: 'custom',
    name: 'Custom MCP',
    description: 'Configure custom Model Context Protocol servers using JSON.',
    logo: '/icons/connectors/mcp.svg',
    method: 'api_key',
    docsUrl: 'https://modelcontextprotocol.io/docs',
    termsUrl: 'https://modelcontextprotocol.io/terms',
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Connect GitHub to manage repositories, issues, and pull requests.',
    logo: '/icons/connectors/github.svg', // Assuming icon class works, but if not we can use placeholder or nothing
    method: 'oauth',
    docsUrl: 'https://docs.github.com/en/rest',
    termsUrl: 'https://docs.github.com/en/site-policy',
    isNativeTab: true,
  },
  {
    id: 'gitlab',
    name: 'GitLab',
    description: 'Connect GitLab to manage repositories, CI/CD, and more.',
    logo: '/icons/connectors/gitlab.svg', // Placeholder
    method: 'oauth',
    docsUrl: 'https://docs.gitlab.com/ee/api/',
    termsUrl: 'https://about.gitlab.com/terms/',
    isNativeTab: true,
  },
  {
    id: 'netlify',
    name: 'Netlify',
    description: 'Connect Netlify to deploy and manage your web applications.',
    logo: '/icons/connectors/netlify.svg', // Placeholder
    method: 'oauth',
    docsUrl: 'https://docs.netlify.com/api/get-started/',
    termsUrl: 'https://www.netlify.com/tos/',
    isNativeTab: true,
  },
  {
    id: 'vercel',
    name: 'Vercel',
    description: 'Connect Vercel to deploy and manage your web applications.',
    logo: '/icons/connectors/vercel.svg', // Placeholder
    method: 'oauth',
    docsUrl: 'https://vercel.com/docs/rest-api',
    termsUrl: 'https://vercel.com/legal/terms',
    isNativeTab: true,
  },
  {
    id: 'supabase',
    name: 'Supabase',
    description: 'Connect Supabase to manage your databases and backend.',
    logo: '/icons/connectors/supabase.svg', // Placeholder
    method: 'oauth',
    docsUrl: 'https://supabase.com/docs/reference/api',
    termsUrl: 'https://supabase.com/terms',
    isNativeTab: true,
  },
];
