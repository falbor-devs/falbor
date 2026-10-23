"use server";

import { and, desc, eq, inArray } from "drizzle-orm";
import { isIP } from "node:net";
import { z } from "zod";
import { generateText } from "ai";
import { db } from "~/lib/db";
import {
  agentTasks,
  productLabAgents,
  productLabDebateMessages,
  productLabDebates,
  productLabChatMessages,
  productLabChats,
  productLabEvents,
  productLabProjects,
  productLabReports,
  productLabReevaluations,
  productLabRelationships,
  productLabSimulations,
} from "~/lib/db/schema";
import { requireWorkspaceActor } from "~/lib/agents/authorization";
import { appendAgentTaskEvent } from "~/lib/agents/task-queue";
import { BILLING_CONFIG, type PlanId } from "~/lib/billing/config";
import {
  estimateProductLabBudget,
  getProductLabAgentLimit,
  PRODUCT_LAB_DEFAULT_CONCURRENCY,
  PRODUCT_LAB_DEFAULT_ROUNDS,
  PRODUCT_LAB_MAX_AGENTS,
  PRODUCT_LAB_MIN_AGENTS,
  PRODUCT_LAB_MODEL,
} from "~/lib/product-lab/config";
import { loadProductContext } from "~/lib/automation/context";
import { getAgentModel } from "~/lib/agent/core";

const projectInputSchema = z.object({
  projectId: z.string().uuid().optional(),
  requestId: z.string().trim().min(8).max(128).optional(),
  name: z.string().trim().min(1).max(120),
  websiteUrl: z.string().trim().url("Enter a valid public website URL"),
  productDescription: z.string().trim().min(10, "Add a product description").max(8000),
  targetAudience: z.string().trim().min(10, "Describe the target audience").max(4000),
  features: z.array(z.string().trim().min(1).max(300)).min(1, "Add at least one feature").max(50),
  pricing: z.string().trim().min(1, "Add pricing information").max(4000),
  competitorContext: z.string().trim().max(4000).optional(),
  agentCount: z
    .number()
    .int()
    .min(PRODUCT_LAB_MIN_AGENTS)
    .max(PRODUCT_LAB_MAX_AGENTS),
  totalRounds: z
    .number()
    .int()
    .min(1)
    .max(5)
    .default(PRODUCT_LAB_DEFAULT_ROUNDS),
});

const productLabCanvasPositionSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
});

function assertPublicUrl(value: string | undefined) {
  if (!value) return null;
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol))
    throw new Error("Only HTTP and HTTPS product URLs are supported");
  if (url.username || url.password)
    throw new Error("Product URLs cannot contain credentials");
  const hostname = url.hostname.toLowerCase();
  if (isIP(hostname))
    throw new Error("Product URLs must use a public hostname");
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.endsWith(".local")
  )
    throw new Error("Private product URLs are not supported");
  return url.toString();
}

function planId(value: string | null | undefined): PlanId {
  return value && value in BILLING_CONFIG.plans ? (value as PlanId) : "free";
}

export async function createProductLabSimulation(
  workspaceId: string,
  input: unknown,
) {
  const actor = await requireWorkspaceActor(workspaceId, "editor");
  const data = projectInputSchema.parse(input);
  const plan = planId(actor.user.subscriptionTier);
  const maximum = getProductLabAgentLimit(plan);
  if (data.agentCount > maximum)
    throw new Error(
      `Your ${BILLING_CONFIG.plans[plan].name} plan supports up to ${maximum} Product Lab agents per simulation.`,
    );
  const websiteUrl = assertPublicUrl(data.websiteUrl);
  const budget = estimateProductLabBudget(data.agentCount, data.totalRounds);
  const simulationName = `${data.name} Product Experience Review`;

  if (data.requestId) {
    const existing = await db.query.productLabSimulations.findFirst({
      where: (table, helpers) =>
        helpers.and(
          helpers.eq(table.workspaceId, workspaceId),
          helpers.eq(table.creationKey, data.requestId!),
        ),
    });
    if (existing) {
      if (["draft", "failed"].includes(existing.status))
        await startProductLabSimulation(workspaceId, existing.id);
      return {
        id: existing.id,
        projectId: existing.projectId,
        model: PRODUCT_LAB_MODEL,
        budget: existing.maxCostUsd,
      };
    }
  }

  let project = data.projectId
    ? await db.query.productLabProjects.findFirst({
        where: (table, helpers) =>
          helpers.and(
            helpers.eq(table.id, data.projectId!),
            helpers.eq(table.workspaceId, workspaceId),
            helpers.eq(table.createdByUserId, actor.user.id),
          ),
      })
    : null;
  let createdProject = false;
  if (!project) {
    [project] = await db
      .insert(productLabProjects)
      .values({
        workspaceId,
        createdByUserId: actor.user.id,
        name: data.name,
        websiteUrl,
        productDescription: data.productDescription || null,
        targetAudience: data.targetAudience || null,
        features: data.features,
        pricing: data.pricing || null,
        competitorContext: data.competitorContext || null,
        status: "draft",
      })
      .returning();
    createdProject = true;
  }
  if (!project) throw new Error("Product Lab project could not be created");

  let simulation;
  try {
    [simulation] = await db
      .insert(productLabSimulations)
      .values({
        projectId: project.id,
        workspaceId,
        creationKey: data.requestId || null,
        name: simulationName,
        status: "draft",
        agentCount: data.agentCount,
        totalRounds: data.totalRounds,
        maxConcurrency: PRODUCT_LAB_DEFAULT_CONCURRENCY,
        maxCostUsd: budget,
      })
      .returning();
  } catch (error) {
    if (data.requestId) {
      const existing = await db.query.productLabSimulations.findFirst({
        where: (table, helpers) =>
          helpers.and(
            helpers.eq(table.workspaceId, workspaceId),
            helpers.eq(table.creationKey, data.requestId!),
          ),
      });
      if (existing)
        return {
          id: existing.id,
          projectId: existing.projectId,
          model: PRODUCT_LAB_MODEL,
          budget: existing.maxCostUsd,
        };
    }
    if (createdProject)
      await db
        .delete(productLabProjects)
        .where(
          and(
            eq(productLabProjects.id, project.id),
            eq(productLabProjects.workspaceId, workspaceId),
          ),
        );
    throw new Error(
      error instanceof Error
        ? `Unable to create Product Lab simulation: ${error.message}`
        : "Unable to create Product Lab simulation",
    );
  }

  await db
    .update(productLabProjects)
    .set({
      name: data.name,
      websiteUrl,
      productDescription: data.productDescription || null,
      targetAudience: data.targetAudience || null,
      features: data.features,
      pricing: data.pricing || null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(productLabProjects.id, project.id),
        eq(productLabProjects.workspaceId, workspaceId),
      ),
    );
  await startProductLabSimulation(workspaceId, simulation.id);
  const result = { project, simulation };
  return {
    id: result.simulation.id,
    projectId: result.project.id,
    model: PRODUCT_LAB_MODEL,
    budget,
  };
}

export async function getOrCreateProductLabProject(workspaceId: string) {
  const actor = await requireWorkspaceActor(workspaceId);
  const existing = await db.query.productLabProjects.findFirst({
    where: (table, helpers) =>
      helpers.and(
        helpers.eq(table.workspaceId, workspaceId),
        helpers.eq(table.createdByUserId, actor.user.id),
      ),
    orderBy: (table, helpers) => [helpers.desc(table.updatedAt)],
  });
  if (existing) return existing;
  const context = await loadProductContext(workspaceId);
  const [project] = await db
    .insert(productLabProjects)
    .values({
      workspaceId,
      createdByUserId: actor.user.id,
      name: context.productName,
      websiteUrl: context.websiteUrl,
      productDescription: context.description,
      targetAudience: context.targetAudience,
      features: context.features,
      pricing: context.pricing,
      competitorContext: context.competitors.join(", "),
      status: "draft",
    })
    .returning();
  return project;
}

export async function updateProductLabProject(
  workspaceId: string,
  projectId: string,
  input: unknown,
) {
  const actor = await requireWorkspaceActor(workspaceId, "editor");
  const data = projectInputSchema
    .omit({ agentCount: true, totalRounds: true, projectId: true })
    .parse(input);
  const websiteUrl = assertPublicUrl(data.websiteUrl);
  const [project] = await db
    .update(productLabProjects)
    .set({
      name: data.name,
      websiteUrl,
      productDescription: data.productDescription || null,
      targetAudience: data.targetAudience || null,
      features: data.features,
      pricing: data.pricing || null,
      competitorContext: data.competitorContext || null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(productLabProjects.id, projectId),
        eq(productLabProjects.workspaceId, workspaceId),
        eq(productLabProjects.createdByUserId, actor.user.id),
      ),
    )
    .returning();
  if (!project) throw new Error("Product Lab project not found");
  return project;
}

export async function listProductLabSimulations(workspaceId: string) {
  await requireWorkspaceActor(workspaceId);
  return db
    .select({ simulation: productLabSimulations, project: productLabProjects })
    .from(productLabSimulations)
    .innerJoin(
      productLabProjects,
      eq(productLabProjects.id, productLabSimulations.projectId),
    )
    .where(eq(productLabSimulations.workspaceId, workspaceId))
    .orderBy(desc(productLabSimulations.createdAt));
}

export async function getProductLabSimulationDetails(
  workspaceId: string,
  simulationId?: string,
) {
  await requireWorkspaceActor(workspaceId);
  const simulation = await db.query.productLabSimulations.findFirst({
    where: (table, helpers) =>
      helpers.and(
        helpers.eq(table.workspaceId, workspaceId),
        simulationId ? helpers.eq(table.id, simulationId) : undefined,
      ),
    orderBy: (table, helpers) => [helpers.desc(table.createdAt)],
  });
  if (!simulation)
    return {
      simulation: null,
      agents: [],
      events: [],
      relationships: [],
      interactions: [],
      report: null,
    };
  const agents = await db.query.productLabAgents.findMany({
    where: (table, helpers) =>
      helpers.and(
        helpers.eq(table.workspaceId, workspaceId),
        helpers.eq(table.simulationId, simulation.id),
      ),
    orderBy: (table, helpers) => [helpers.asc(table.createdAt)],
  });
  const events = await db.query.productLabEvents.findMany({
    where: (table, helpers) =>
      helpers.and(
        helpers.eq(table.workspaceId, workspaceId),
        helpers.eq(table.simulationId, simulation.id),
      ),
    orderBy: (table, helpers) => [helpers.desc(table.createdAt)],
    limit: 100,
  });
  const report = await db.query.productLabReports.findFirst({
    where: (table, helpers) =>
      helpers.and(
        helpers.eq(table.workspaceId, workspaceId),
        helpers.eq(table.simulationId, simulation.id),
      ),
  });
  const relationships = await db.query.productLabRelationships.findMany({
    where: (table, helpers) =>
      helpers.and(
        helpers.eq(table.workspaceId, workspaceId),
        helpers.eq(table.simulationId, simulation.id),
      ),
  });
  const interactions = await db.query.productLabInteractions.findMany({
    where: (table, helpers) =>
      helpers.and(
        helpers.eq(table.workspaceId, workspaceId),
        helpers.eq(table.simulationId, simulation.id),
      ),
    orderBy: (table, helpers) => [helpers.asc(table.createdAt)],
  });
  return { simulation, agents, events, relationships, interactions, report };
}

export async function getProductLabExperiments(
  workspaceId: string,
  simulationId: string,
) {
  await requireWorkspaceActor(workspaceId);
  const debates = await db.query.productLabDebates.findMany({
    where: (table, helpers) =>
      helpers.and(
        helpers.eq(table.workspaceId, workspaceId),
        helpers.eq(table.simulationId, simulationId),
      ),
    orderBy: (table, helpers) => [helpers.desc(table.createdAt)],
    limit: 20,
  });
  const messages = await db.query.productLabDebateMessages.findMany({
    where: (table, helpers) =>
      helpers.and(
        helpers.eq(table.workspaceId, workspaceId),
        helpers.eq(table.simulationId, simulationId),
      ),
    orderBy: (table, helpers) => [helpers.asc(table.createdAt)],
    limit: 100,
  });
  const reevaluations = await db.query.productLabReevaluations.findMany({
    where: (table, helpers) =>
      helpers.and(
        helpers.eq(table.workspaceId, workspaceId),
        helpers.eq(table.simulationId, simulationId),
      ),
    orderBy: (table, helpers) => [helpers.desc(table.createdAt)],
    limit: 20,
  });
  return { debates, messages, reevaluations };
}

export async function createProductLabDebate(
  workspaceId: string,
  simulationId: string,
  agentIds: string[],
  topic: string,
) {
  await requireWorkspaceActor(workspaceId, "editor");
  const cleanTopic = topic.trim();
  const selectedIds = [...new Set(agentIds)].slice(0, 2);
  if (selectedIds.length !== 2) throw new Error("Select exactly two agents");
  if (!cleanTopic || cleanTopic.length > 1000)
    throw new Error("Enter a debate topic up to 1,000 characters");
  const agents = await db.query.productLabAgents.findMany({
    where: (table, helpers) =>
      helpers.and(
        helpers.eq(table.workspaceId, workspaceId),
        helpers.eq(table.simulationId, simulationId),
        inArray(table.id, selectedIds),
      ),
  });
  if (agents.length !== 2) throw new Error("Selected agents were not found");
  const [debate] = await db
    .insert(productLabDebates)
    .values({
      simulationId,
      workspaceId,
      topic: cleanTopic,
      agentIds: selectedIds,
      status: "running",
    })
    .returning();
  const messages: Array<{ agentId: string; content: string; round: number }> =
    [];
  try {
    for (let round = 1; round <= 2; round += 1) {
      for (const agent of agents) {
        const other = agents.find((item) => item.id !== agent.id)!;
        const previous = messages
          .map((item) => {
            const speaker = agents.find(
              (agentItem) => agentItem.id === item.agentId,
            );
            return `${speaker?.name || "Agent"}: ${item.content}`;
          })
          .join("\n");
        const result = await generateText({
          model: getAgentModel(PRODUCT_LAB_MODEL),
          experimental_providerMetadata: {
            openai: { reasoningEffort: "none", maxCompletionTokens: 700 },
          } as any,
          system: `You are one simulated Product Lab persona in a short debate. Speak in your own natural, direct voice. State your position first, then the strongest reason. You may disagree, but do not invent product facts or claim real customer evidence. If evidence is missing, say so. Keep the response under 180 words.\n\nYOUR PERSONA: ${JSON.stringify(agent.persona)}\nYOUR EVALUATION: ${JSON.stringify(agent.initialEvaluation)}\nOTHER PERSONA: ${JSON.stringify(other.persona)}\nOTHER EVALUATION: ${JSON.stringify(other.initialEvaluation)}`,
          prompt: `Debate topic: ${cleanTopic}\nRound: ${round}\nPrevious debate messages:\n${previous || "None yet."}`,
          maxRetries: 1,
          abortSignal: AbortSignal.timeout(60_000),
        });
        const content = result.text.trim();
        await db.insert(productLabDebateMessages).values({
          debateId: debate.id,
          simulationId,
          workspaceId,
          agentId: agent.id,
          round,
          content,
        });
        messages.push({ agentId: agent.id, content, round });
      }
    }
    await db
      .update(productLabDebates)
      .set({ status: "completed", updatedAt: new Date() })
      .where(eq(productLabDebates.id, debate.id));
    await db.insert(productLabEvents).values({
      simulationId,
      workspaceId,
      eventType: "agent_debate_completed",
      payload: {
        debateId: debate.id,
        topic: cleanTopic,
        agentIds: selectedIds,
      },
    });
    return { debate, messages };
  } catch (error) {
    await db
      .update(productLabDebates)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(productLabDebates.id, debate.id));
    throw new Error(
      error instanceof Error
        ? `Debate failed: ${error.message}`
        : "Debate failed",
    );
  }
}

export async function createProductLabReevaluation(
  workspaceId: string,
  simulationId: string,
  proposedChange: string,
) {
  await requireWorkspaceActor(workspaceId, "editor");
  const cleanChange = proposedChange.trim();
  if (!cleanChange || cleanChange.length > 2000)
    throw new Error("Enter a proposed change up to 2,000 characters");
  const agents = await db.query.productLabAgents.findMany({
    where: (table, helpers) =>
      helpers.and(
        helpers.eq(table.workspaceId, workspaceId),
        helpers.eq(table.simulationId, simulationId),
      ),
    orderBy: (table, helpers) => [helpers.asc(table.createdAt)],
    limit: 20,
  });
  if (!agents.length) throw new Error("No evaluated agents are available");
  const [scenario] = await db
    .insert(productLabReevaluations)
    .values({ simulationId, workspaceId, proposedChange, status: "running" })
    .returning();
  const resultSchema = z.object({
    wouldChangeOpinion: z.boolean(),
    revisedOpinion: z.string().min(1).max(1000),
    reason: z.string().min(1).max(700),
  });
  const results = [];
  try {
    for (const agent of agents) {
      const result = await generateText({
        model: getAgentModel(PRODUCT_LAB_MODEL),
        experimental_providerMetadata: {
          openai: { reasoningEffort: "none", maxCompletionTokens: 700 },
        } as any,
        system: `You are evaluating a hypothetical product change as a simulated persona. Do not overwrite or deny the original evaluation. Do not invent facts. If the proposed change does not affect your priorities, say so. Use direct everyday language and label this as hypothetical. Return JSON only with keys wouldChangeOpinion (boolean), revisedOpinion (string), and reason (string).\n\nPERSONA: ${JSON.stringify(agent.persona)}\nORIGINAL EVALUATION: ${JSON.stringify(agent.initialEvaluation)}`,
        prompt: `Hypothetical change: ${cleanChange}`,
        maxRetries: 1,
        abortSignal: AbortSignal.timeout(60_000),
      });
      let parsed: z.infer<typeof resultSchema>;
      try {
        parsed = resultSchema.parse(JSON.parse(result.text));
      } catch {
        parsed = {
          wouldChangeOpinion: false,
          revisedOpinion: result.text.trim().slice(0, 1000),
          reason: "The model returned an unstructured hypothetical response.",
        };
      }
      results.push({ agentId: agent.id, agentName: agent.name, ...parsed });
    }
    await db
      .update(productLabReevaluations)
      .set({ status: "completed", results })
      .where(eq(productLabReevaluations.id, scenario.id));
    return { scenario: { ...scenario, status: "completed", results } };
  } catch (error) {
    await db
      .update(productLabReevaluations)
      .set({ status: "failed" })
      .where(eq(productLabReevaluations.id, scenario.id));
    throw new Error(
      error instanceof Error
        ? `Reevaluation failed: ${error.message}`
        : "Reevaluation failed",
    );
  }
}

export async function updateProductLabAgentPosition(
  workspaceId: string,
  simulationId: string,
  agentId: string,
  position: unknown,
) {
  await requireWorkspaceActor(workspaceId, "editor");
  const canvasPosition = productLabCanvasPositionSchema.parse(position);
  const [agent] = await db
    .update(productLabAgents)
    .set({ canvasPosition, updatedAt: new Date() })
    .where(
      and(
        eq(productLabAgents.id, agentId),
        eq(productLabAgents.simulationId, simulationId),
        eq(productLabAgents.workspaceId, workspaceId),
      ),
    )
    .returning({
      id: productLabAgents.id,
      canvasPosition: productLabAgents.canvasPosition,
    });
  if (!agent) throw new Error("Product Lab agent not found");
  return agent;
}

export async function getProductLabChat(
  workspaceId: string,
  simulationId: string,
) {
  const actor = await requireWorkspaceActor(workspaceId);
  const simulation = await db.query.productLabSimulations.findFirst({
    where: (table, helpers) =>
      helpers.and(
        helpers.eq(table.id, simulationId),
        helpers.eq(table.workspaceId, workspaceId),
      ),
  });
  if (!simulation) throw new Error("Simulation not found");
  const chat = await db.query.productLabChats.findFirst({
    where: (table, helpers) =>
      helpers.and(
        helpers.eq(table.simulationId, simulationId),
        helpers.eq(table.workspaceId, workspaceId),
        helpers.eq(table.userId, actor.user.id),
      ),
  });
  if (!chat) return { chatId: null, messages: [] };
  const messages = await db.query.productLabChatMessages.findMany({
    where: (table, helpers) =>
      helpers.and(
        helpers.eq(table.chatId, chat.id),
        helpers.eq(table.workspaceId, workspaceId),
      ),
    orderBy: (table, helpers) => [helpers.asc(table.createdAt)],
  });
  return { chatId: chat.id, messages };
}

export async function askProductLabAgents(
  workspaceId: string,
  simulationId: string,
  agentIds: string[],
  message: string,
) {
  const actor = await requireWorkspaceActor(workspaceId, "viewer");
  const cleanMessage = message.trim();
  const uniqueAgentIds = [...new Set(agentIds)].slice(0, 3);
  if (!cleanMessage || cleanMessage.length > 4000)
    throw new Error("Enter a message up to 4,000 characters");
  if (!uniqueAgentIds.length)
    throw new Error("Select at least one simulated agent");
  const simulation = await db.query.productLabSimulations.findFirst({
    where: (table, helpers) =>
      helpers.and(
        helpers.eq(table.id, simulationId),
        helpers.eq(table.workspaceId, workspaceId),
      ),
  });
  if (!simulation) throw new Error("Simulation not found");
  const agents = await db.query.productLabAgents.findMany({
    where: (table, helpers) =>
      helpers.and(
        helpers.eq(table.simulationId, simulationId),
        helpers.eq(table.workspaceId, workspaceId),
        inArray(table.id, uniqueAgentIds),
      ),
  });
  if (agents.length !== uniqueAgentIds.length)
    throw new Error(
      "One or more selected agents are not part of this simulation",
    );
  let chat = await db.query.productLabChats.findFirst({
    where: (table, helpers) =>
      helpers.and(
        helpers.eq(table.simulationId, simulationId),
        helpers.eq(table.workspaceId, workspaceId),
        helpers.eq(table.userId, actor.user.id),
      ),
  });
  if (!chat)
    [chat] = await db
      .insert(productLabChats)
      .values({ simulationId, workspaceId, userId: actor.user.id })
      .returning();
  await db.insert(productLabChatMessages).values({
    chatId: chat.id,
    simulationId,
    workspaceId,
    role: "user",
    content: cleanMessage,
    mentions: uniqueAgentIds,
  });
  const history = await db.query.productLabChatMessages.findMany({
    where: (table, helpers) =>
      helpers.and(
        helpers.eq(table.chatId, chat.id),
        helpers.eq(table.workspaceId, workspaceId),
      ),
    orderBy: (table, helpers) => [helpers.desc(table.createdAt)],
    limit: 12,
  });
  const responses = [];
  for (const agent of agents) {
    const result = await generateText({
      model: getAgentModel(PRODUCT_LAB_MODEL),
      experimental_providerMetadata: {
        openai: { reasoningEffort: "none", maxCompletionTokens: 800 },
      } as any,
      system: `You are a simulated Product Lab persona, not a real customer. Answer in the persona's own direct, everyday voice. Start with the answer or opinion, then give the main reason. Avoid forced compliments, corporate language, generic disclaimers, and repetitive phrasing. Do not invent evidence, do not claim to have performed actions you did not perform, and do not contradict the recorded evaluation without explaining what new evidence would change it. If the product information is insufficient, say that clearly.\n\nPERSONA:\n${JSON.stringify(agent.persona)}\n\nINITIAL EVALUATION:\n${JSON.stringify(agent.initialEvaluation)}\n\nVOTE:\n${agent.vote || "not recorded"} — ${agent.voteReason || "not recorded"}\n\nMEMORY:\n${JSON.stringify(agent.memory)}`,
      messages: [
        ...history.reverse().map((item) => ({
          role:
            item.role === "user" ? ("user" as const) : ("assistant" as const),
          content: item.content,
        })),
        { role: "user" as const, content: cleanMessage },
      ],
      maxRetries: 1,
      abortSignal: AbortSignal.timeout(60_000),
    });
    const text = result.text.trim();
    await db.insert(productLabChatMessages).values({
      chatId: chat.id,
      simulationId,
      workspaceId,
      agentId: agent.id,
      role: "assistant",
      content: text,
      mentions: [agent.id],
    });
    responses.push({ agentId: agent.id, agentName: agent.name, content: text });
  }
  await db
    .update(productLabChats)
    .set({ updatedAt: new Date() })
    .where(eq(productLabChats.id, chat.id));
  return { chatId: chat.id, responses };
}

export async function startProductLabSimulation(
  workspaceId: string,
  simulationId: string,
) {
  const actor = await requireWorkspaceActor(workspaceId, "editor");
  const simulation = await db.query.productLabSimulations.findFirst({
    where: (table, helpers) =>
      helpers.and(
        helpers.eq(table.id, simulationId),
        helpers.eq(table.workspaceId, workspaceId),
      ),
  });
  if (!simulation) throw new Error("Simulation not found");
  if (!["draft", "failed"].includes(simulation.status))
    throw new Error("This simulation cannot be started in its current state");
  const project = await db.query.productLabProjects.findFirst({
    where: (table, helpers) =>
      helpers.and(
        helpers.eq(table.id, simulation.projectId),
        helpers.eq(table.workspaceId, workspaceId),
      ),
  });
  if (!project) throw new Error("Product Lab project not found");
  const chief = await db.query.agents.findFirst({
    where: (table, helpers) =>
      helpers.and(
        helpers.eq(table.workspaceId, workspaceId),
        helpers.eq(table.role, "Chief of Staff"),
      ),
  });
  if (!chief) throw new Error("Workspace Chief of Staff is not configured");

  const claimed = await db
    .update(productLabSimulations)
    .set({ status: "queued", error: null, updatedAt: new Date() })
    .where(
      and(
        eq(productLabSimulations.id, simulationId),
        eq(productLabSimulations.workspaceId, workspaceId),
        inArray(productLabSimulations.status, ["draft", "failed"]),
      ),
    )
    .returning({ id: productLabSimulations.id });
  if (!claimed.length)
    throw new Error("This simulation has already been queued or completed");
  try {
    const [task] = await db
      .insert(agentTasks)
      .values({
        workspaceId,
        createdByUserId: actor.user.id,
        assignedAgentId: chief.id,
        title: `Product Lab simulation: ${project.name}`,
        input: {
          source: "product_lab_simulation",
          simulationId,
          projectId: project.id,
          message: `Run Product Lab simulation ${simulationId} for project ${project.name}. Use the Product Lab runtime and persist every real event, evaluation, interaction, and report.`,
        },
        maxSteps: 50,
        maxCostUsd: simulation.maxCostUsd,
      })
      .returning();
    await appendAgentTaskEvent({
      workspaceId,
      taskId: task.id,
      agentId: chief.id,
      type: "product_lab_queued",
      payload: { simulationId, model: PRODUCT_LAB_MODEL },
    });
    return { taskId: task.id, simulationId };
  } catch (error) {
    await db
      .update(productLabSimulations)
      .set({
        status: "failed",
        error:
          error instanceof Error ? error.message : "Unable to queue simulation",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(productLabSimulations.id, simulationId),
          eq(productLabSimulations.workspaceId, workspaceId),
        ),
      );
    throw new Error(
      error instanceof Error
        ? `Unable to queue simulation: ${error.message}`
        : "Unable to queue simulation",
    );
  }
}
