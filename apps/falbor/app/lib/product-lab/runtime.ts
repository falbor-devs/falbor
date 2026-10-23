import "server-only";

import { generateObject } from "ai";
import { isIP } from "node:net";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "~/lib/db";
import {
  agentTaskRuns,
  agentTasks,
  productLabAgents,
  productLabEvents,
  productLabInteractions,
  productLabRelationships,
  productLabReports,
  productLabProjects,
  productLabSimulations,
  productLabUsage,
} from "~/lib/db/schema";
import { getAgentModel } from "~/lib/agent/core";
import {
  appendAgentTaskEvent,
  isAgentTaskCancelled,
  renewAgentTaskLease,
} from "~/lib/agents/task-queue";
import { PRODUCT_LAB_MODEL } from "./config";

const PRODUCT_LAB_PROVIDER_OPTIONS = {
  openai: { reasoningEffort: "none", maxCompletionTokens: 6000 },
} as any;

const personaSchema = z.object({
  name: z.string().min(1).max(120),
  role: z.string().min(1).max(160),
  background: z.string().min(1).max(1500),
  goals: z.array(z.string().min(1).max(300)).min(1).max(5),
  preferences: z.array(z.string().min(1).max(300)).min(1).max(6),
  evaluationPriorities: z.array(z.string().min(1).max(200)).min(1).max(6),
  behavioralCharacteristics: z.array(z.string().min(1).max(200)).min(1).max(6),
});

const personaBatchSchema = z.object({
  agents: z.array(personaSchema).min(1).max(10),
});
const evaluationSchema = z.object({
  opinion: z.string().max(1200).default("The available product information was not sufficient for a detailed evaluation."),
  productClarity: z.coerce.number().int().min(1).max(5).default(3),
  valueProposition: z.coerce.number().int().min(1).max(5).default(3),
  featureUsefulness: z.coerce.number().int().min(1).max(5).default(3),
  userExperience: z.coerce.number().int().min(1).max(5).default(3),
  pricingPerception: z.coerce.number().int().min(1).max(5).default(3),
  audienceFit: z.coerce.number().int().min(1).max(5).default(3),
  positives: z.array(z.string().max(600)).max(8).default([]),
  negatives: z.array(z.string().max(600)).max(8).default([]),
  concerns: z.array(z.string().max(600)).max(8).default([]),
  recommendations: z.array(z.string().max(600)).max(8).default([]),
  evidence: z
    .array(
      z.object({
        observation: z.string().min(1).max(600),
        sourceUrl: z.string().url().nullable().default(null),
        category: z.enum(["verified", "source-based", "simulated", "inferred"]).default("simulated"),
      }),
    )
    .max(12),
  uncertainty: z.array(z.string().max(500)).max(8).default([]),
  vote: z.enum(["LIKE", "DISLIKE"]).default("LIKE"),
  voteReason: z.string().max(700).default("The simulated evaluator did not provide a specific vote reason."),
  purchaseIntent: z.object({
    wouldConsiderPaying: z.boolean().default(false),
    reason: z.string().max(700).default("Insufficient information to assess purchase intent."),
    blockers: z.array(z.string().max(300)).max(6).default([]),
    reasonablePrice: z.string().max(300).default("Unknown"),
  }).default({}),
});

const interactionSchema = z.object({
  response: z.string().min(1).max(1800),
  relationshipType: z.enum(["agrees", "challenges", "complements", "neutral"]),
  evidence: z.array(z.string().min(1).max(500)).max(6),
});

const reportSchema = z.object({
  overallAssessment: z.string().min(1).max(1600),
  strengths: z.array(z.string().min(1).max(500)).max(8),
  weaknesses: z.array(z.string().min(1).max(500)).max(8),
  recommendations: z.array(z.string().min(1).max(500)).max(8),
  purchaseIntentSummary: z.string().min(1).max(1200),
});

type Usage = {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
};

function safeUsage(usage: Usage | undefined) {
  const inputTokens = usage?.promptTokens || 0;
  const outputTokens = usage?.completionTokens || 0;
  return {
    inputTokens,
    outputTokens,
    totalTokens: usage?.totalTokens || inputTokens + outputTokens,
  };
}

function costForTokens(tokens: number) {
  return Math.round(tokens * 0.00001 * 1000000) / 1000000;
}

function productLabErrorDetails(error: unknown, stage: string) {
  const raw = error instanceof Error ? error.message : String(error);
  const message = raw
    .replace(
      /(sk|key|token|secret)[-_a-z0-9]*\s*[:=]\s*[^\s,}]+/gi,
      "$1=[redacted]",
    )
    .slice(0, 2000);
  return {
    stage,
    message,
    name: error instanceof Error ? error.name : "Error",
    timestamp: new Date().toISOString(),
  };
}

function cleanText(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isPublicUrl(value: string) {
  const url = new URL(value);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  )
    return false;
  const host = url.hostname.toLowerCase();
  if (isIP(host)) return false;
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host.endsWith(".local")
  )
    return false;
  if (
    /^(10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(host)
  )
    return false;
  return true;
}

async function inspectProduct(project: any) {
  const provided = {
    productName: project.name,
    productDescription: project.productDescription || "Unknown",
    targetAudience: project.targetAudience || "Unknown",
    features: Array.isArray(project.features) ? project.features : [],
    pricing: project.pricing || "Unknown",
    competitorContext: project.competitorContext || "Unknown",
  };
  if (!project.websiteUrl || !isPublicUrl(project.websiteUrl))
    return { ...provided, evidence: [] };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(project.websiteUrl, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "FalborProductLab/1.0" },
    });
    const html = await response.text();
    const title =
      html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() || null;
    const description =
      html.match(
        /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
      )?.[1] || null;
    return {
      ...provided,
      fetchedStatus: response.status,
      pageTitle: title,
      pageDescription: description,
      pageText: cleanText(html).slice(0, 18000),
      evidence: [
        {
          sourceUrl: project.websiteUrl,
          title: title || project.websiteUrl,
          type: "website",
        },
      ],
    };
  } catch (error) {
    return {
      ...provided,
      websiteInspection: "unavailable",
      inspectionError:
        error instanceof Error ? error.message : "Request failed",
      evidence: [],
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function recordStage(
  simulation: any,
  stage: string,
  details: Record<string, unknown> = {},
) {
  await db.insert(productLabEvents).values({
    simulationId: simulation.id,
    workspaceId: simulation.workspaceId,
    eventType: "stage_changed",
    payload: { stage, ...details },
  });
}

async function recordUsage(
  simulationId: string,
  workspaceId: string,
  operation: string,
  usage: Usage | undefined,
) {
  const normalized = safeUsage(usage);
  await db.insert(productLabUsage).values({
    simulationId,
    workspaceId,
    model: PRODUCT_LAB_MODEL,
    operation,
    requestCount: 1,
    inputTokens: normalized.inputTokens,
    outputTokens: normalized.outputTokens,
    estimatedCostUsd: costForTokens(normalized.totalTokens),
  });
  const simulation = await db.query.productLabSimulations.findFirst({
    where: (table, helpers) => helpers.eq(table.id, simulationId),
  });
  const current =
    simulation?.usage && typeof simulation.usage === "object"
      ? (simulation.usage as Record<string, number>)
      : {};
  await db
    .update(productLabSimulations)
    .set({
      usage: {
        requests: (current.requests || 0) + 1,
        inputTokens: (current.inputTokens || 0) + normalized.inputTokens,
        outputTokens: (current.outputTokens || 0) + normalized.outputTokens,
        estimatedCostUsd:
          Math.round(
            ((current.estimatedCostUsd || 0) +
              costForTokens(normalized.totalTokens)) *
              1000000,
          ) / 1000000,
      },
      updatedAt: new Date(),
    })
    .where(eq(productLabSimulations.id, simulationId));
}

async function generatePersonas(project: any, simulation: any, knowledge: any) {
  const created: any[] = [];
  const seen = new Set<string>();
  while (created.length < simulation.agentCount) {
    if (await isAgentTaskCancelled(simulation.taskId))
      throw new Error("Simulation task cancelled");
    const remaining = simulation.agentCount - created.length;
    const batchSize = Math.min(10, remaining);
    const result = await generateObject({
      model: getAgentModel(PRODUCT_LAB_MODEL),
      experimental_providerMetadata: PRODUCT_LAB_PROVIDER_OPTIONS,
      schema: personaBatchSchema,
      prompt: `Create ${batchSize} meaningfully different fictional product-evaluation personas for a SaaS product. The personas are simulated users, not real people. Use the shared product facts below to make their roles and evaluation priorities relevant. Do not invent product facts. Avoid duplicate roles, goals, or perspectives. Give each persona a distinct communication style: a developer can be technical, a founder can be practical, and a buyer can focus on value.\n\nPRODUCT KNOWLEDGE:\n${JSON.stringify(knowledge)}`,
      maxRetries: 1,
      abortSignal: AbortSignal.timeout(90_000),
    });
    await recordUsage(
      simulation.id,
      simulation.workspaceId,
      "persona_generation",
      result.usage,
    );
    for (const persona of result.object.agents) {
      const key = `${persona.role.toLowerCase()}|${persona.evaluationPriorities.join("|").toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const [agent] = await db
        .insert(productLabAgents)
        .values({
          simulationId: simulation.id,
          workspaceId: simulation.workspaceId,
          name: persona.name,
          persona,
          status: "ready",
        })
        .returning();
      created.push(agent);
      await db.insert(productLabEvents).values({
        simulationId: simulation.id,
        workspaceId: simulation.workspaceId,
        agentId: agent.id,
        eventType: "agent_created",
        payload: { name: persona.name, role: persona.role },
      });
      if (created.length >= simulation.agentCount) break;
    }
    if (result.object.agents.length === 0)
      throw new Error("The model returned no valid personas");
  }
  return db.query.productLabAgents.findMany({
    where: (table, helpers) => helpers.eq(table.simulationId, simulation.id),
  });
}

async function evaluateAgent(
  agent: any,
  simulation: any,
  project: any,
  knowledge: any,
) {
  await db
    .update(productLabAgents)
    .set({ status: "evaluating", updatedAt: new Date() })
    .where(eq(productLabAgents.id, agent.id));
  const result = await generateObject({
    model: getAgentModel(PRODUCT_LAB_MODEL),
    experimental_providerMetadata: PRODUCT_LAB_PROVIDER_OPTIONS,
    schema: evaluationSchema,
    prompt: `Evaluate the product independently from this simulated persona. Start with the agent's actual opinion in plain, everyday English and explain the main reason immediately. Be direct, specific, concise, and natural. Do not lead with forced compliments. Let the persona's experience and priorities shape the voice, and do not make every persona sound alike. Do not invent product defects or claim real customer evidence. If something cannot be verified, say that the information is missing instead of treating it as a fact. Clearly distinguish verified observations, source-based information, simulated opinion, and inferred hypotheses. Include a simulated purchase-intent answer: whether this persona would consider paying, why, blockers, and a reasonable price only when the available information supports one.\n\nPERSONA:\n${JSON.stringify(agent.persona)}\n\nPRODUCT KNOWLEDGE:\n${JSON.stringify(knowledge)}\n\nPROJECT:\n${JSON.stringify({ name: project.name, websiteUrl: project.websiteUrl })}`,
    maxRetries: 3,
    abortSignal: AbortSignal.timeout(90_000),
  });
  await recordUsage(
    simulation.id,
    simulation.workspaceId,
    "independent_evaluation",
    result.usage,
  );
  await db
    .update(productLabAgents)
    .set({
      status: "evaluated",
      initialEvaluation: result.object,
      vote: result.object.vote,
      voteReason: result.object.voteReason,
      voteHistory: [
        {
          vote: result.object.vote,
          reason: result.object.voteReason,
          round: 0,
          createdAt: new Date().toISOString(),
        },
      ],
      memory: {
        facts: knowledge,
        initialOpinion: result.object,
        interactions: [],
      },
      updatedAt: new Date(),
    })
    .where(eq(productLabAgents.id, agent.id));
  await db.insert(productLabEvents).values({
    simulationId: simulation.id,
    workspaceId: simulation.workspaceId,
    agentId: agent.id,
    eventType: "evaluation_completed",
    round: 0,
    payload: {
      name: agent.name,
      role: agent.persona.role,
      evaluation: result.object,
    },
  });
}

async function mapWithConcurrency<T>(
  items: T[],
  limit: number,
  callback: (item: T, index: number) => Promise<void>,
) {
  let cursor = 0;
  const worker = async () => {
    while (cursor < items.length) {
      const index = cursor++;
      await callback(items[index], index);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );
}

async function runInteractions(
  agents: any[],
  simulation: any,
  project: any,
  knowledge: any,
) {
  if (agents.length < 2) return;
  await mapWithConcurrency(
    agents,
    simulation.maxConcurrency,
    async (agent, index) => {
      if (await isAgentTaskCancelled(simulation.taskId))
        throw new Error("Simulation task cancelled");
      const peer = agents[(index + 1) % agents.length];
      await db
        .update(productLabAgents)
        .set({ status: "discussing", updatedAt: new Date() })
        .where(eq(productLabAgents.id, agent.id));
      const existing = await db.query.productLabInteractions.findFirst({
        where: (table, helpers) =>
          helpers.and(
            helpers.eq(table.simulationId, simulation.id),
            helpers.eq(table.fromAgentId, agent.id),
            helpers.eq(table.toAgentId, peer.id),
            helpers.eq(table.round, 1),
          ),
      });
      if (existing?.status === "completed") return;
      const interaction =
        existing ||
        (
          await db
            .insert(productLabInteractions)
            .values({
              simulationId: simulation.id,
              workspaceId: simulation.workspaceId,
              fromAgentId: agent.id,
              toAgentId: peer.id,
              round: 1,
              topic: "Compare independent product evaluations",
              status: "running",
            })
            .returning()
        )[0];
      const result = await generateObject({
        model: getAgentModel(PRODUCT_LAB_MODEL),
        experimental_providerMetadata: PRODUCT_LAB_PROVIDER_OPTIONS,
        schema: interactionSchema,
        prompt: `Have the first simulated evaluator respond to the second evaluator's recorded opinion. Use only the product facts and evaluations below. State agreement, challenge, complement, or neutrality with concrete reasoning. Do not invent customer evidence.

PRODUCT: ${JSON.stringify({ project, knowledge })}
FIRST EVALUATOR: ${JSON.stringify({ persona: agent.persona, evaluation: agent.initialEvaluation })}
SECOND EVALUATOR: ${JSON.stringify({ persona: peer.persona, evaluation: peer.initialEvaluation })}`,
        maxRetries: 1,
        abortSignal: AbortSignal.timeout(90_000),
      });
      await recordUsage(
        simulation.id,
        simulation.workspaceId,
        "agent_interaction",
        result.usage,
      );
      await db
        .update(productLabInteractions)
        .set({
          output: result.object.response,
          evidence: result.object.evidence,
          status: "completed",
        })
        .where(eq(productLabInteractions.id, interaction.id));
      await db
        .insert(productLabRelationships)
        .values({
          simulationId: simulation.id,
          workspaceId: simulation.workspaceId,
          sourceAgentId: agent.id,
          targetAgentId: peer.id,
          relationshipType: result.object.relationshipType,
          weight: 1,
          evidence: result.object.evidence,
        })
        .onConflictDoUpdate({
          target: [
            productLabRelationships.simulationId,
            productLabRelationships.sourceAgentId,
            productLabRelationships.targetAgentId,
          ],
          set: {
            relationshipType: result.object.relationshipType,
            evidence: result.object.evidence,
            weight: 1,
          },
        });
      await db.insert(productLabEvents).values({
        simulationId: simulation.id,
        workspaceId: simulation.workspaceId,
        agentId: agent.id,
        round: 1,
        eventType: "agent_interaction_completed",
        payload: {
          toAgentId: peer.id,
          relationshipType: result.object.relationshipType,
          evidence: result.object.evidence,
        },
      });
      await db
        .update(productLabAgents)
        .set({ status: "completed", updatedAt: new Date() })
        .where(eq(productLabAgents.id, agent.id));
    },
  );
}

async function generateFinalReport(
  agents: any[],
  simulation: any,
  project: any,
  knowledge: any,
) {
  const likeCount = agents.filter((agent) => agent.vote === "LIKE").length;
  const dislikeCount = agents.filter(
    (agent) => agent.vote === "DISLIKE",
  ).length;
  const result = await generateObject({
    model: getAgentModel(PRODUCT_LAB_MODEL),
    experimental_providerMetadata: PRODUCT_LAB_PROVIDER_OPTIONS,
    schema: reportSchema,
    prompt: `Synthesize a clear Product Lab report from actual simulated evaluations. Distinguish simulated opinions from verified product evidence. Do not claim customers, revenue, or real-world validation. Keep the summary direct and grounded in the supplied records. Include a concise summary of simulated purchase intent and clearly label it as simulated.

PRODUCT: ${JSON.stringify({ project, knowledge })}
EVALUATIONS: ${JSON.stringify(agents.map((agent) => ({ name: agent.name, persona: agent.persona, evaluation: agent.initialEvaluation, vote: agent.vote, voteReason: agent.voteReason, purchaseIntent: agent.initialEvaluation?.purchaseIntent })))}
LIKE COUNT: ${likeCount}
DISLIKE COUNT: ${dislikeCount}`,
    maxRetries: 1,
    abortSignal: AbortSignal.timeout(90_000),
  });
  await recordUsage(
    simulation.id,
    simulation.workspaceId,
    "final_report",
    result.usage,
  );
  await db
    .insert(productLabReports)
    .values({
      simulationId: simulation.id,
      workspaceId: simulation.workspaceId,
      status: "completed",
      model: PRODUCT_LAB_MODEL,
      report: { ...result.object, likeCount, dislikeCount },
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: productLabReports.simulationId,
      set: {
        status: "completed",
        model: PRODUCT_LAB_MODEL,
        report: { ...result.object, likeCount, dislikeCount },
        updatedAt: new Date(),
      },
    });
  await db.insert(productLabEvents).values({
    simulationId: simulation.id,
    workspaceId: simulation.workspaceId,
    eventType: "final_report_completed",
    round: 2,
    payload: { likeCount, dislikeCount },
  });
}

async function executeProductLabTaskInternal(task: any, workspace: any) {
  const input = (task.input || {}) as {
    simulationId?: string;
    projectId?: string;
  };
  if (!input.simulationId || !input.projectId)
    throw new Error("Product Lab task is missing simulation references");
  const simulationId = input.simulationId;
  const projectId = input.projectId;
  const simulation = await db.query.productLabSimulations.findFirst({
    where: (table, helpers) =>
      helpers.and(
        helpers.eq(table.id, simulationId),
        helpers.eq(table.workspaceId, task.workspaceId),
      ),
  });
  const project = await db.query.productLabProjects.findFirst({
    where: (table, helpers) =>
      helpers.and(
        helpers.eq(table.id, projectId),
        helpers.eq(table.workspaceId, task.workspaceId),
      ),
  });
  if (!simulation || !project) throw new Error("Product Lab records not found");
  let stage = "task_loaded";
  const run = await db
    .insert(agentTaskRuns)
    .values({
      taskId: task.id,
      agentId: task.assignedAgentId,
      attempt: task.attempts,
      status: "running",
    })
    .returning();
  const runId = run[0]?.id;
  await db
    .update(productLabSimulations)
    .set({
      status: "running",
      startedAt: simulation.startedAt || new Date(),
      error: null,
      updatedAt: new Date(),
    })
    .where(eq(productLabSimulations.id, simulation.id));
  await appendAgentTaskEvent({
    workspaceId: task.workspaceId,
    taskId: task.id,
    runId,
    agentId: task.assignedAgentId,
    type: "product_lab_started",
    payload: { simulationId: simulation.id, model: PRODUCT_LAB_MODEL },
  });
  const leaseHeartbeat = setInterval(() => {
    void renewAgentTaskLease(task.id);
  }, 60_000);
  await recordStage(simulation, "initializing");
  try {
    stage = "product_inspection";
    await recordStage(simulation, "analyzing_product");
    const knowledge = await inspectProduct(project);
    await db
      .update(productLabProjects)
      .set({
        knowledgeBase: knowledge,
        status: "researched",
        updatedAt: new Date(),
      })
      .where(eq(productLabProjects.id, project.id));
    await db.insert(productLabEvents).values({
      simulationId: simulation.id,
      workspaceId: task.workspaceId,
      eventType: "product_knowledge_ready",
      payload: {
        evidence: knowledge.evidence,
        fields: Object.keys(knowledge),
      },
    });
    const agents = await db.query.productLabAgents.findMany({
      where: (table, helpers) => helpers.eq(table.simulationId, simulation.id),
    });
    stage = "agent_generation";
    await recordStage(simulation, "generating_agents");
    const population =
      agents.length >= simulation.agentCount
        ? agents
        : await generatePersonas(
            project,
            { ...simulation, taskId: task.id },
            knowledge,
          );
    stage = "independent_evaluations";
    await recordStage(simulation, "evaluating_product");
    await mapWithConcurrency(
      population.filter(
        (agent) => agent.status !== "evaluated" || !agent.initialEvaluation,
      ),
      simulation.maxConcurrency,
      async (agent) => evaluateAgent(agent, simulation, project, knowledge),
    );
    await db
      .update(productLabSimulations)
      .set({ currentRound: 1, updatedAt: new Date() })
      .where(eq(productLabSimulations.id, simulation.id));
    stage = "agent_interactions";
    await recordStage(simulation, "agent_discussions");
    await runInteractions(
      population,
      { ...simulation, taskId: task.id },
      project,
      knowledge,
    );
    await db
      .update(productLabSimulations)
      .set({ currentRound: 2, updatedAt: new Date() })
      .where(eq(productLabSimulations.id, simulation.id));
    stage = "final_report";
    await recordStage(simulation, "generating_final_report");
    await generateFinalReport(population, simulation, project, knowledge);
    await db
      .update(productLabAgents)
      .set({ status: "completed", updatedAt: new Date() })
      .where(eq(productLabAgents.simulationId, simulation.id));
    await db
      .update(productLabSimulations)
      .set({
        status: "completed",
        currentRound: simulation.totalRounds,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(productLabSimulations.id, simulation.id));
    await db
      .update(productLabProjects)
      .set({ status: "evaluated", updatedAt: new Date() })
      .where(eq(productLabProjects.id, project.id));
    await recordStage(simulation, "completed");
    await db
      .update(agentTaskRuns)
      .set({ status: "completed", completedAt: new Date() })
      .where(eq(agentTaskRuns.id, runId));
    await db
      .update(agentTasks)
      .set({
        status: "completed",
        completedAt: new Date(),
        leaseExpiresAt: null,
        result: {
          simulationId: simulation.id,
          agentsEvaluated: population.length,
        },
        updatedAt: new Date(),
      })
      .where(eq(agentTasks.id, task.id));
    await appendAgentTaskEvent({
      workspaceId: task.workspaceId,
      taskId: task.id,
      runId,
      agentId: task.assignedAgentId,
      type: "product_lab_completed",
      payload: {
        simulationId: simulation.id,
        agentsEvaluated: population.length,
      },
    });
    clearInterval(leaseHeartbeat);
    return { status: "completed" as const };
  } catch (error) {
    clearInterval(leaseHeartbeat);
    const details = productLabErrorDetails(error, stage);
    const message = `${details.stage}: ${details.message}`;
    console.error("Product Lab execution failed", {
      simulationId: simulation.id,
      taskId: task.id,
      workspaceId: task.workspaceId,
      ...details,
    });
    await recordStage(simulation, "failed", details);
    await db
      .update(productLabSimulations)
      .set({
        status: "failed",
        error: JSON.stringify(details),
        updatedAt: new Date(),
      })
      .where(eq(productLabSimulations.id, simulation.id));
    await db
      .update(agentTaskRuns)
      .set({ status: "failed", error: message, completedAt: new Date() })
      .where(eq(agentTaskRuns.id, runId));
    await db
      .update(agentTasks)
      .set({
        status: "failed",
        error: JSON.stringify(details),
        leaseExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(eq(agentTasks.id, task.id));
    await appendAgentTaskEvent({
      workspaceId: task.workspaceId,
      taskId: task.id,
      runId,
      agentId: task.assignedAgentId,
      type: "product_lab_failed",
      payload: { simulationId: simulation.id, error: details },
    });
    return { status: "failed" as const, error: message };
  }
}

export async function executeProductLabTask(task: any, workspace: any) {
  try {
    return await executeProductLabTaskInternal(task, workspace);
  } catch (error) {
    const input = (task.input || {}) as { simulationId?: string };
    const details = productLabErrorDetails(error, "task_initialization");
    console.error("Product Lab task initialization failed", {
      simulationId: input.simulationId,
      taskId: task.id,
      workspaceId: task.workspaceId,
      ...details,
    });
    if (input.simulationId) {
      await db
        .update(productLabSimulations)
        .set({
          status: "failed",
          error: JSON.stringify(details),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(productLabSimulations.id, input.simulationId),
            eq(productLabSimulations.workspaceId, task.workspaceId),
          ),
        )
        .catch((persistError) =>
          console.error("Product Lab failure persistence failed", {
            simulationId: input.simulationId,
            taskId: task.id,
            error: productLabErrorDetails(persistError, "failure_persistence"),
          }),
        );
    }
    return {
      status: "failed" as const,
      error: `${details.stage}: ${details.message}`,
    };
  }
}
