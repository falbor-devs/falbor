export interface AnswerFacts {
  questionId: string;
  provider: string;
  mentioned: boolean;
  recommended: boolean;
  position: number | null;
  descriptionAccurate: boolean | null;
  pricingAccurate: boolean | null;
  statusAccurate: boolean | null;
  misunderstands: boolean;
  competitorsAhead: number;
  competitorCount: number;
  communitySources: number;
}

export interface QuestionInput {
  id: string;
  intent: 'low' | 'medium' | 'high';
}

const INTENT_WEIGHT = { low: 0.3, medium: 0.6, high: 1 } as const;

export function criticalityLevel(score: number) {
  if (score >= 60) {
    return 'high';
  }

  return score >= 30 ? 'medium' : 'low';
}

export function computeCriticality(question: QuestionInput, answers: AnswerFacts[], providerCount: number) {
  const intentWeight = INTENT_WEIGHT[question.intent];

  if (answers.length === 0) {
    return null;
  }

  const gapSeverity =
    answers.reduce((sum, a) => {
      if (!a.mentioned) {
        return sum + 1;
      }

      return sum + (a.position !== null && a.position > 3 ? 0.5 : 0);
    }, 0) / answers.length;

  const competitivePressure = answers.filter((a) => a.competitorCount > 0 && (!a.mentioned || a.competitorsAhead > 0)).length / answers.length;
  const acquisitionSignal = answers.filter((a) => a.communitySources > 0).length / answers.length;
  const modelAgreement = Math.min(1, answers.length / Math.max(providerCount, 1));

  const base = 0.5 * gapSeverity + 0.3 * competitivePressure + 0.2 * acquisitionSignal;
  const score = Math.round(100 * intentWeight * base * (0.5 + 0.5 * modelAgreement) * 10) / 10;

  return {
    intentWeight,
    gapSeverity,
    competitivePressure,
    acquisitionSignal,
    modelAgreement,
    score,
    level: criticalityLevel(score),
  };
}

export function computeVisibility(answers: AnswerFacts[]) {
  return answers.length === 0 ? 0 : answers.filter((a) => a.mentioned).length / answers.length;
}

export function computeAveragePosition(answers: AnswerFacts[]) {
  const positions = answers.filter((a) => a.mentioned && a.position !== null).map((a) => a.position as number);

  return positions.length === 0 ? null : positions.reduce((sum, p) => sum + p, 0) / positions.length;
}

export function computeShareOfVoice(userMentions: number, totalBrandMentions: number) {
  return totalBrandMentions === 0 ? 0 : userMentions / totalBrandMentions;
}

export function computeProductUnderstanding(answers: AnswerFacts[]) {
  const mentioned = answers.filter((a) => a.mentioned);

  if (mentioned.length === 0) {
    return 0;
  }

  const understood = mentioned.filter(
    (a) => !a.misunderstands && a.descriptionAccurate !== false && a.pricingAccurate !== false && a.statusAccurate !== false,
  );

  return understood.length / mentioned.length;
}

export function computePriority(o: {
  reach: number;
  intent: number;
  icpRelevance: number;
  competitiveGap: number;
  effort: number;
  confidence: number;
}) {
  const value = 0.2 * o.reach + 0.3 * o.intent + 0.25 * o.icpRelevance + 0.25 * o.competitiveGap;
  const effortFactor = 1 - 0.4 * o.effort;

  return Math.round(value * o.confidence * effortFactor * 1000) / 10;
}
