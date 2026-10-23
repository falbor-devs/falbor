import type { PlanId } from "~/lib/billing/config";

export const PRODUCT_LAB_MODEL = "gpt-5.6-luna";
export const PRODUCT_LAB_MIN_AGENTS = 10;
export const PRODUCT_LAB_MAX_AGENTS = 100;
export const PRODUCT_LAB_FREE_MAX_AGENTS = 40;
export const PRODUCT_LAB_DEFAULT_ROUNDS = 3;
export const PRODUCT_LAB_DEFAULT_CONCURRENCY = 4;

export function getProductLabAgentLimit(plan: PlanId) {
  return plan === "free" ? PRODUCT_LAB_FREE_MAX_AGENTS : PRODUCT_LAB_MAX_AGENTS;
}

export function estimateProductLabBudget(
  agentCount: number,
  rounds = PRODUCT_LAB_DEFAULT_ROUNDS,
) {
  return Math.max(
    1,
    Math.round((1.5 + agentCount * 0.035 + rounds * agentCount * 0.01) * 100) /
      100,
  );
}
