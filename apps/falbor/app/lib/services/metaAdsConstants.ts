/**
 * Client-safe Meta Ads constants.
 *
 * Kept separate from the Graph API service so client components can import
 * these values without pulling the server-side service into a shared module
 * that would cross the client/server boundary.
 */

export const META_API_VERSION = 'v19.0';
export const META_GRAPH_BASE = `https://graph.facebook.com/${META_API_VERSION}`;
export const META_OAUTH_DIALOG = `https://www.facebook.com/${META_API_VERSION}/dialog/oauth`;

export const META_OAUTH_SCOPES = [
  'ads_management',
  'ads_read',
  'business_management',
  'pages_show_list',
  'pages_read_engagement',
].join(',');

/**
 * Static mapping of Meta campaign objectives (v19.0 OUTCOME_*) to the settings
 * that Meta actually supports. Used by the wizard to show only valid options.
 * This mirrors Meta's documented objective → optimization goal / billing event /
 * destination matrix; it does not invent fields.
 */
export type ObjectiveConfig = {
  id: string;
  label: string;
  description: string;
  optimizationGoals: string[];
  billingEvents: string[];
  requiresPromotedObject?: string[];
  destinationTypes?: string[];
  supportsConversionLocation?: boolean;
  defaultOptimizationGoal: string;
  defaultBillingEvent: string;
  defaultDestinationType?: string;
};

export const META_OBJECTIVES: ObjectiveConfig[] = [
  {
    id: 'OUTCOME_AWARENESS',
    label: 'Awareness',
    description: 'Show your ads to people most likely to remember them.',
    optimizationGoals: ['REACH', 'IMPRESSIONS', 'AD_RECALL_LIFT'],
    billingEvents: ['IMPRESSIONS'],
    defaultOptimizationGoal: 'REACH',
    defaultBillingEvent: 'IMPRESSIONS',
  },
  {
    id: 'OUTCOME_TRAFFIC',
    label: 'Traffic',
    description: 'Send people to a destination like your website.',
    optimizationGoals: ['LINK_CLICKS', 'LANDING_PAGE_VIEWS', 'IMPRESSIONS', 'REACH'],
    billingEvents: ['IMPRESSIONS', 'LINK_CLICKS'],
    defaultOptimizationGoal: 'LINK_CLICKS',
    defaultBillingEvent: 'IMPRESSIONS',
    destinationTypes: ['WEBSITE', 'APP', 'MESSENGER', 'WHATSAPP', 'INSTAGRAM_DIRECT', 'ON_AD'],
  },
  {
    id: 'OUTCOME_ENGAGEMENT',
    label: 'Engagement',
    description: 'Get more messages, video views, post engagement, or event responses.',
    optimizationGoals: ['POST_ENGAGEMENT', 'PAGE_LIKES', 'EVENT_RESPONSES', 'THRUPLAY', 'CONVERSATIONS'],
    billingEvents: ['IMPRESSIONS'],
    defaultOptimizationGoal: 'POST_ENGAGEMENT',
    defaultBillingEvent: 'IMPRESSIONS',
  },
  {
    id: 'OUTCOME_LEADS',
    label: 'Leads',
    description: 'Collect leads for your business.',
    optimizationGoals: ['LEAD_GENERATION', 'QUALITY_LEAD', 'LINK_CLICKS', 'CONVERSATIONS'],
    billingEvents: ['IMPRESSIONS'],
    defaultOptimizationGoal: 'LEAD_GENERATION',
    defaultBillingEvent: 'IMPRESSIONS',
    destinationTypes: ['ON_AD', 'WEBSITE', 'MESSENGER', 'INSTAGRAM_DIRECT'],
  },
  {
    id: 'OUTCOME_APP_PROMOTION',
    label: 'App promotion',
    description: 'Find people likely to install and use your app.',
    optimizationGoals: ['APP_INSTALLS', 'LINK_CLICKS', 'OFFSITE_CONVERSIONS'],
    billingEvents: ['IMPRESSIONS'],
    requiresPromotedObject: ['application_id'],
    defaultOptimizationGoal: 'APP_INSTALLS',
    defaultBillingEvent: 'IMPRESSIONS',
  },
  {
    id: 'OUTCOME_SALES',
    label: 'Sales',
    description: 'Find people likely to purchase your product.',
    optimizationGoals: ['OFFSITE_CONVERSIONS', 'VALUE', 'LINK_CLICKS', 'CONVERSATIONS'],
    billingEvents: ['IMPRESSIONS'],
    requiresPromotedObject: ['pixel_id'],
    destinationTypes: ['WEBSITE', 'ON_AD', 'MESSENGER', 'INSTAGRAM_DIRECT'],
    defaultOptimizationGoal: 'OFFSITE_CONVERSIONS',
    defaultBillingEvent: 'IMPRESSIONS',
  },
];

export function getObjectiveConfig(objective: string): ObjectiveConfig | undefined {
  return META_OBJECTIVES.find((o) => o.id === objective);
}

/** Standard CTA button types supported by Meta link ads. */
export const META_CALL_TO_ACTIONS = [
  'LEARN_MORE',
  'SHOP_NOW',
  'SIGN_UP',
  'BOOK_NOW',
  'DOWNLOAD',
  'CONTACT_US',
  'GET_QUOTE',
  'SUBSCRIBE',
  'APPLY_NOW',
  'GET_OFFER',
  'MESSAGE_PAGE',
  'SEND_MESSAGE',
  'WHATSAPP_MESSAGE',
  'CALL_NOW',
];

export const META_GENDERS: Record<string, number> = { all: 0, male: 1, female: 2 };

/**
 * Official Facebook Page creation flow. Meta does not reliably expose Page
 * creation to third-party apps, so this is the supported fallback we point users
 * to when the API refuses.
 */
export const META_PAGE_CREATE_URL = 'https://www.facebook.com/pages/create/';
export const META_PAGES_URL = 'https://www.facebook.com/pages/';

/** Common top-level Page categories accepted by Meta's `category_enum` field. */
export const META_PAGE_CATEGORIES: Array<{ id: string; label: string }> = [
  { id: 'BRAND', label: 'Brand' },
  { id: 'PRODUCT_SERVICE', label: 'Product/Service' },
  { id: 'LOCAL_BUSINESS', label: 'Local Business' },
  { id: 'COMPANY_ORGANISATION', label: 'Company/Organisation' },
  { id: 'WEBSITE', label: 'Website' },
  { id: 'ARTIST', label: 'Artist' },
  { id: 'PUBLIC_FIGURE', label: 'Public Figure' },
  { id: 'ENTERTAINER', label: 'Entertainer' },
  { id: 'COMMUNITY', label: 'Community' },
  { id: 'EDUCATION', label: 'Education' },
  { id: 'NON_PROFIT_ORGANISATION', label: 'Non-Profit Organisation' },
  { id: 'MEDIA_NEWS_COMPANY', label: 'Media/News Company' },
  { id: 'APP_PAGE', label: 'App Page' },
  { id: 'SHOPPING_RETAIL', label: 'Shopping & Retail' },
  { id: 'RESTAURANT', label: 'Restaurant' },
  { id: 'HEALTH_BEAUTY', label: 'Health/Beauty' },
];
