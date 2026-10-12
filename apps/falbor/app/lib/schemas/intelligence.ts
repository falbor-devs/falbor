import { z } from 'zod';

export const intelligenceSchema = z.object({
  cofounderBrief: z.string().describe('A direct, honest, and specific brief written like a smart co-founder speaking to the user. No generic optimism.'),
  strongestSignal: z.string().describe('The strongest positive evidence or signal found in the workspace context.'),
  biggestConcern: z.string().describe('The biggest risk, gap, or concern regarding the product or strategy.'),
  whatNotToDoNext: z.string().describe('A clear warning on what the user should AVOID doing next, to prevent wasting time.'),
  evidenceLevel: z.enum(['None', 'Low', 'Medium', 'High', 'Strong']).describe('Overall level of evidence supporting the product-market fit.'),
  
  healthScore: z.number().min(0).max(100).describe('Overall health score (0-100) derived from the breakdown below.'),
  healthBreakdown: z.object({
    problemClarity: z.object({ score: z.number().min(0).max(10), explanation: z.string() }),
    targetAudienceClarity: z.object({ score: z.number().min(0).max(10), explanation: z.string() }),
    evidenceValidation: z.object({ score: z.number().min(0).max(10), explanation: z.string() }),
    differentiation: z.object({ score: z.number().min(0).max(10), explanation: z.string() }),
    mvpReadiness: z.object({ score: z.number().min(0).max(10), explanation: z.string() }),
    distribution: z.object({ score: z.number().min(0).max(10), explanation: z.string() }),
    monetization: z.object({ score: z.number().min(0).max(10), explanation: z.string() }),
    traction: z.object({ score: z.number().min(0).max(10), explanation: z.string() }),
  }).describe('Breakdown of the product health across key categories (scores 0-10)'),
  
  stage: z.enum(['Idea', 'Validation', 'MVP Building', 'MVP Live', 'Early Traction', 'Pre-PMF', 'PMF/Growth', 'Scaling']).describe('Evidence-based current stage of the product'),
  
  targetAudience: z.string().describe('Short string for the primary target audience (backwards compatibility)'),
  targetAudienceDetails: z.object({
    icp: z.string().describe('Ideal Customer Profile'),
    whoIsNot: z.string().describe('Who is explicitly NOT the target audience'),
    buyerVsUser: z.string().describe('Distinction between buyer and user, if relevant'),
    reasoning: z.string().describe('Why the AI reached this conclusion based on the context'),
  }),
  
  mainProblem: z.string().describe('The actual customer pain, not a product feature description'),
  
  positioning: z.string().describe('Short positioning statement (backwards compatibility)'),
  positioningDetails: z.object({
    category: z.string().describe('The market category'),
    alternatives: z.string().describe('What alternative solutions users currently use'),
    reasonToSwitch: z.string().describe('Why someone would switch to this product'),
    differentiationStrength: z.enum(['Weak', 'Moderate', 'Strong']).describe('How strong the differentiation is currently'),
  }),
  
  nextBestAction: z.object({
    title: z.string().describe('ONE highest-priority action, not generic advice.'),
    description: z.string().describe('Brief explanation of why this is the best next step.'),
    expectedOutcome: z.string().describe('What should happen if this action is successful.'),
    effortLevel: z.enum(['Low', 'Medium', 'High']).describe('Estimated effort level.'),
    successCriteria: z.string().describe('How to measure success for this action.'),
    promptText: z.string().describe('Suggested text to send to the AI to start this action.')
  }),
  
  marketSignals: z.object({
    competitors: z.array(z.string()).describe('List of known competitors. Do not invent these.'),
    risks: z.array(z.string()).describe('Potential risks or vulnerabilities'),
    opportunities: z.array(z.string()).describe('Opportunities for growth or differentiation'),
    missingTrustElements: z.array(z.string()).describe('Elements missing that could build trust'),
    validationSignals: z.array(z.string()).describe('Positive signals of validation from the market/context'),
    negativeSignals: z.array(z.string()).describe('Negative signals or red flags'),
    assumptionsToValidate: z.array(z.string()).describe('Key assumptions that currently have no proof'),
  }),
  
  competitorMatrix: z.array(z.object({
    name: z.string().describe('Competitor name'),
    xScore: z.number().min(0).max(10).describe('Score on X-axis (e.g., Niche vs Broad / Mass Market)'),
    yScore: z.number().min(0).max(10).describe('Score on Y-axis (e.g., Low Price vs Premium)'),
    xAxisLabel: z.string().describe('What the X axis represents (e.g. "Broad Market")'),
    yAxisLabel: z.string().describe('What the Y axis represents (e.g. "Premium Price")')
  })).describe('Data for plotting a 2x2 competitor matrix. Include the users product as "You" or the product name.'),
  
  targetAudienceHeatmap: z.array(z.object({
    segment: z.string().describe('The audience segment name'),
    intentLevel: z.enum(['Low', 'Medium', 'High']).describe('How high their intent to solve the problem is'),
    budgetLevel: z.enum(['Low', 'Medium', 'High']).describe('Their budget level for a solution'),
    description: z.string().describe('Brief description of why they fit this tier')
  })).describe('List of 3 distinct target audience segments tiered by value'),
  
  acquisitionFunnel: z.object({
    topOfFunnel: z.object({ tactic: z.string(), description: z.string() }).describe('How to get initial traffic/attention'),
    activation: z.object({ tactic: z.string(), description: z.string() }).describe('How to convert traffic to users ("Aha" moment)'),
    retention: z.object({ tactic: z.string(), description: z.string() }).describe('How to keep users coming back or referring others')
  }).describe('The optimal theoretical growth funnel for this product'),
  
  sourcesUsed: z.array(z.string()).describe('Specific parts of the workspace context used to draw conclusions (e.g. "Customer interview transcripts", not "workspace data")'),
  missingInformation: z.array(z.string()).describe('Specific questions to ask the user to fill in critical gaps. Only questions that materially change a decision. Do NOT invent data.')
});
