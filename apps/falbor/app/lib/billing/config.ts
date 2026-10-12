export type PlanId = 'free' | 'pro' | 'power' | 'business';

export interface PlanConfig {
  id: PlanId;
  name: string;
  price: number;
  monthlyCredits: number;
  maxAgents: number | 'unlimited';
  maxWorkspaces: number;
  browserView: boolean;
  creditEfficiencyMultiplier: number; // Applied to cost calculations: Free=1.2, Pro=1.0, Power=0.85, Business=0.75
  features: string[];
  popular?: boolean;
}

export const BILLING_CONFIG = {
  // Base token cost: 1,000 token-equivalents = 1 credit (so 1 credit = 1k tokens base)
  tokensPerCredit: 1000,
  
  // Platform usage markup (percentage)
  platformMarkupPercent: 30, // 30% additional usage

  // Model cost multipliers (relative to base GPT model)
  modelMultipliers: {
    'gpt-5.6-luna': 1.0,
    'gpt-5-6': 1.0,
    'gpt-5.6-sol': 1.5,
    'claude-sonnet-4-5': 1.8,
    'claude-haiku-4-5': 0.8,
    'gemini-3.1-pro': 1.2,
    'deepseek-v3': 0.7,
    'qwen3.7-flash': 0.5,
    'default': 1.0,
  } as Record<string, number>,

  // Plans definition
  plans: {
    free: {
      id: 'free',
      name: 'Free',
      price: 0,
      monthlyCredits: 10,
      maxAgents: 2,
      maxWorkspaces: 1,
      browserView: false,
      creditEfficiencyMultiplier: 1.2, // Free consumes 20% faster
      features: [
        '1 Workspace allowed',
        '10 monthly credits',
        'Maximum 2 Agents',
        'No Browser View',
        'Basic AI Agent functionality',
      ],
    },
    pro: {
      id: 'pro',
      name: 'Pro',
      price: 19,
      monthlyCredits: 150,
      maxAgents: 'unlimited',
      maxWorkspaces: 3,
      browserView: true,
      creditEfficiencyMultiplier: 1.0, // Standard baseline efficiency
      popular: true,
      features: [
        'Everything in Free',
        'Up to 3 Workspaces',
        '150 monthly credits',
        'Unlimited Agents',
        'Browser View enabled',
        'Increased credit efficiency',
      ],
    },
    power: {
      id: 'power',
      name: 'Power',
      price: 39,
      monthlyCredits: 500,
      maxAgents: 'unlimited',
      maxWorkspaces: 5,
      browserView: true,
      creditEfficiencyMultiplier: 0.85, // 15% better efficiency
      features: [
        'Everything in Pro',
        'Up to 5 Workspaces',
        '500 monthly credits',
        'Invite member to workspace',
        'Unlimited Agents',
        'Browser View enabled',
        'Higher credit allowance & efficiency',
      ],
    },
    business: {
      id: 'business',
      name: 'Business',
      price: 99,
      monthlyCredits: 1500,
      maxAgents: 'unlimited',
      maxWorkspaces: 10,
      browserView: true,
      creditEfficiencyMultiplier: 0.75, // 25% better efficiency
      features: [
        'Everything in Power',
        'Up to 10 Workspaces',
        '1,500 monthly credits',
        'Invite member to workspace',
        'Unlimited Agents',
        'Browser View enabled',
        'Free early access to all beta testing features',
        'Highest credit allowance & best efficiency',
      ],
    },
  } as Record<PlanId, PlanConfig>,
};

/**
 * Calculates credit consumption for a given token count, model, and plan.
 * Supports fractional credits (returns decimal rounded to 2 decimal places, minimum 0.1).
 */
export function calculateCreditCost(
  tokens: number,
  model: string = 'default',
  planId: PlanId = 'free'
): number {
  if (tokens <= 0) return 0.1;

  const plan = BILLING_CONFIG.plans[planId] || BILLING_CONFIG.plans.free;
  
  // Model multiplier
  const modelKey = Object.keys(BILLING_CONFIG.modelMultipliers).find((k) =>
    model.toLowerCase().includes(k.toLowerCase())
  ) || 'default';
  const modelMultiplier = BILLING_CONFIG.modelMultipliers[modelKey] || 1.0;

  // Platform usage markup (percentage)
  const markupMultiplier = 1 + BILLING_CONFIG.platformMarkupPercent / 100;

  // Billable token-equivalent usage
  const billableTokens = tokens * modelMultiplier * markupMultiplier;

  // Raw credits from billable tokens
  const rawCredits = billableTokens / BILLING_CONFIG.tokensPerCredit;

  // Plan credit efficiency adjustment
  const finalCredits = rawCredits * plan.creditEfficiencyMultiplier;

  // Round to 2 decimals, minimum 0.1 credit for any request
  const rounded = Math.round(finalCredits * 100) / 100;
  return Math.max(0.1, rounded);
}
