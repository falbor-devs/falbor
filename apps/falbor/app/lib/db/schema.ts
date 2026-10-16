import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, uuid, jsonb, boolean, integer, decimal, serial, varchar, real, index, uniqueIndex } from "drizzle-orm/pg-core";

// Re-export types so `import { Agency } from '~/lib/db/schema'` keeps working.
// The actual type definitions are in types.ts (safe for client components).
export type {
    User, Agency, SubAccount, Permission, Tag, Pipeline, Lane, Ticket,
    Trigger, Automation, Action, Funnel, FunnelPage, FunnelProduct,
    NewUser, NewAgency, NewSubAccount, NewFunnel, NewFunnelPage,
    AgencyWithSubAccounts, UserWithAgency, FunnelWithPages, LaneWithTickets, PipelineWithLanes,
    Plan, AgencySidebarOption, Contact,
    Prisma,
} from './types'

export { ActionType, TriggerTypes } from './types'

export const agentProspects = pgTable("agent_prospects", {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: text("workspace_id").notNull(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    company: text("company").notNull(),
    matchReason: text("match_reason"),
    status: text("status").notNull(),
    messagePreview: text("message_preview"),
    sentAt: text("sent_at"),
    lastActivity: text("last_activity"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const signalPosts = pgTable("signal_posts", {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: text("workspace_id").notNull(),
    platform: text("platform").notNull(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    url: text("url"),
    author: text("author"),
    likes: integer("likes").default(0),
    comments: integer("comments").default(0),
    relevanceScore: integer("relevance_score").default(0),
    relevanceReason: text("relevance_reason"),
    painPoints: jsonb("pain_points").default("[]"),
    postedAt: text("posted_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const brandMentionPosts = pgTable("brand_mention_posts", {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: text("workspace_id").notNull(),
    platform: text("platform").notNull(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    url: text("url"),
    author: text("author"),
    likes: integer("likes").default(0),
    comments: integer("comments").default(0),
    brandKeyword: text("brand_keyword").notNull(),
    sentiment: text("sentiment").default("neutral"),
    relevanceReason: text("relevance_reason"),
    postedAt: text("posted_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const myProspects = pgTable("my_prospects", {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: text("workspace_id").notNull(),
    userId: uuid("user_id").notNull(),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    company: text("company"),
    jobTitle: text("job_title"),
    source: text("source").default("manual"),
    sourceProvider: text("source_provider"),
    externalId: text("external_id"),
    status: text("status").notNull().default("new"),
    notes: text("notes"),
    linkedAiProspectId: uuid("linked_ai_prospect_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    lastActivityAt: timestamp("last_activity_at").defaultNow().notNull(),
});

export const googleOAuthTokens = pgTable("google_oauth_tokens", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().unique(),
    accessToken: text("access_token").notNull(),
    refreshToken: text("refresh_token"),
    expiresAt: timestamp("expires_at"),
    scope: text("scope"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull().unique(),
    username: text("username").unique(),
    passwordHash: text("password_hash"),
    displayName: text("display_name"),
    avatarUrl: text("avatar_url"),
    bio: text("bio"),
    coverUrl: text("cover_url"),
    timezone: text("timezone"),
    displayEmail: boolean("display_email").default(false).notNull(),
    instagramUrl: text("instagram_url"),
    linkedinUrl: text("linkedin_url"),
    twitterUrl: text("twitter_url"),
    customLinks: jsonb("custom_links").default("[]"),
    location: text("location"),
    statusMessage: text("status_message"),
    skills: jsonb("skills").default("[]"),
    badges: jsonb("badges").default("[]"),
    stats: jsonb("stats").default("{}"),
    profileApps: jsonb("profile_apps").default("[]"),
    balance: integer("balance").default(10).notNull(),
    subscriptionTier: text("subscription_tier").default("free").notNull(),
    subscriptionExpiresAt: timestamp("subscription_expires_at"),
    isVerified: boolean("is_verified").default(true).notNull(),
    verificationCode: text("verification_code"),
    role: text("role").default("SUBACCOUNT_USER"),
    agencyId: uuid("agency_id"), // Will reference ve_agencies.id
    enterpriseContent: jsonb("enterprise_content"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const marketerProfiles = pgTable("marketer_profiles", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
    fullName: text("full_name").notNull(),
    photoUrl: text("photo_url"),
    bio: text("bio").notNull(),
    yearsOfExperience: integer("years_of_experience").notNull(),
    age: integer("age"),
    phone: text("phone"),
    showEmail: boolean("show_email").default(false).notNull(),
    location: text("location"),
    specialties: jsonb("specialties").default("[]"),
    linkedinUrl: text("linkedin_url"),
    twitterUrl: text("twitter_url"),
    instagramUrl: text("instagram_url"),
    isPublic: boolean("is_public").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const follows = pgTable("follows", {
    id: uuid("id").defaultRandom().primaryKey(),
    followerId: uuid("follower_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    followingId: uuid("following_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const marketerProducts = pgTable("marketer_products", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    service: text("service").notNull(),
    price: integer("price").notNull(),
    originalPrice: integer("original_price"),
    portfolioImages: jsonb("portfolio_images").default("[]"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const communityMessages = pgTable("community_messages", {
    id: uuid("id").defaultRandom().primaryKey(),
    senderId: uuid("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    receiverId: uuid("receiver_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pollVotes = pgTable("poll_votes", {
    id: uuid("id").defaultRandom().primaryKey(),
    messageId: uuid("message_id").notNull().references(() => communityMessages.id, { onDelete: "cascade" }),
    voterId: uuid("voter_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    optionIndex: integer("option_index").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const payments = pgTable("payments", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    orderId: text("order_id").notNull(),
    amount: integer("amount").notNull(),
    tier: text("tier"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const marketerEarnings = pgTable("marketer_earnings", {
    id: uuid("id").defaultRandom().primaryKey(),
    marketerUserId: uuid("marketer_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    payerUserId: uuid("payer_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    productName: text("product_name").notNull(),
    amount: integer("amount").notNull(),
    paymentProvider: text("payment_provider").default("paypal").notNull(),
    transactionId: text("transaction_id").notNull(),
    status: text("status").default("completed").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const payoutRequests = pgTable("payout_requests", {
    id: uuid("id").defaultRandom().primaryKey(),
    marketerUserId: uuid("marketer_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    paypalEmail: text("paypal_email").notNull(),
    amount: integer("amount").notNull(),
    status: text("status").default("pending").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const memories = pgTable("memories", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userPreferences = pgTable("user_preferences", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    value: jsonb("value").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const providerSettings = pgTable("provider_settings", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    providerName: text("provider_name").notNull(),
    settings: jsonb("settings").default("{}"),
    enabled: boolean("enabled").default(false),
    apiKey: text("api_key"),
    baseUrl: text("base_url"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const budgetPlans = pgTable("budget_plans", {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").notNull(),
    amount: integer("amount").notNull(),
    status: text("status").default("analyzing").notNull(),
    results: jsonb("results").default("{}"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const browserSessions = pgTable("browser_sessions", {
    id: text("id").primaryKey(), // browserbase session id
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at").notNull(),
});

export const cronRuns = pgTable("cron_runs", {
    id: uuid("id").defaultRandom().primaryKey(),
    cronName: text("cron_name").notNull(),
    runDate: text("run_date").notNull().unique(), // e.g. "2026-08-25" to enforce once per day
    executedAt: timestamp("executed_at").defaultNow().notNull(),
});

export const templates = pgTable("templates", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    shortDescription: text("short_description").notNull(),
    description: text("description"),
    mainImage: text("main_image"),
    images: jsonb("images").default("[]"),
    url: text("url"),
    chatId: text("chat_id"),
    categories: jsonb("categories").default("[]"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const templateReviews = pgTable("template_reviews", {
    id: uuid("id").defaultRandom().primaryKey(),
    templateId: uuid("template_id").notNull().references(() => templates.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    content: text("content"),
    likes: integer("likes").default(0),
    dislikes: integer("dislikes").default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const serviceConnections = pgTable("service_connections", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    service: text("service").notNull(),
    token: text("token"),
    tokenType: text("token_type"),
    username: text("username"),
    stats: jsonb("stats").default("{}"),
    settings: jsonb("settings").default("{}"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const mcpSettings = pgTable("mcp_settings", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    config: jsonb("config").default("{}"),
    maxLLMSteps: integer("max_llm_steps").default(15),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const chatFolders = pgTable("chat_folders", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const chats = pgTable("chats", {
    id: text("id").primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    workspaceId: varchar("workspace_id", { length: 255 }),
    folderId: uuid("folder_id").references(() => chatFolders.id, { onDelete: "set null" }),
    title: text("title").default("New Chat"),
    description: text("description"),
    isPublic: boolean("is_public").default(false).notNull(),
    model: text("model"),
    provider: text("provider"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const feedbacks = pgTable("feedbacks", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    content: jsonb("content").notNull(),
    rating: integer("rating").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const agentMessageFeedback = pgTable("agent_message_feedback", {
    id: uuid("id").defaultRandom().primaryKey(),
    messageId: text("message_id").notNull(),
    workspaceId: text("workspace_id"),
    rating: text("rating").notNull(),
    feedbackText: text("feedback_text"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const deployments = pgTable("deployments", {
    chatId: text("chat_id").primaryKey().references(() => chats.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    provider: text("provider").notNull(),
    subdomain: text("subdomain"),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    seoImage: text("seo_image"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
    id: text("id").primaryKey(),
    chatId: text("chat_id").notNull().references(() => chats.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    content: text("content"),
    toolInvocations: jsonb("tool_invocations"),
    imageData: text("image_data"),
    parts: jsonb("parts").default("[]"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const chatSnapshots = pgTable("chat_snapshots", {
    id: uuid("id").defaultRandom().primaryKey(),
    chatId: text("chat_id").notNull().references(() => chats.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    files: jsonb("files").default("{}"),
    summary: text("summary"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projects = pgTable("projects", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    chatId: text("chat_id").references(() => chats.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    description: text("description"),
    deploymentConfig: jsonb("deployment_config").default("{}"),
    repoInfo: jsonb("repo_info").default("{}"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const tabConfigurations = pgTable("tab_configurations", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    config: jsonb("config").default("{}"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const eventLogs = pgTable("event_logs", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    category: text("category"),
    message: text("message").notNull(),
    details: jsonb("details").default("{}"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const gitCredentials = pgTable("git_credentials", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    domain: text("domain").notNull(),
    username: text("username"),
    token: text("token"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const neonDatabases = pgTable("neon_databases", {
    chatId: text("chat_id").primaryKey(),
    databaseUrl: text("database_url").notNull(),
    projectId: text("project_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const supabaseDatabases = pgTable("supabase_databases", {
    chatId: text("chat_id").primaryKey(),
    supabaseUrl: text("supabase_url").notNull(),
    supabaseAnonKey: text("supabase_anon_key").notNull(),
    projectId: text("project_id").notNull(),
    databasePassword: text("database_password").notNull(),
    databaseUrl: text("database_url"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const skills = pgTable("skills", {
    id: text("id").primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    content: text("content").notNull(),
    isActive: boolean("is_active").default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const generatedImages = pgTable("generated_images", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    prompt: text("prompt").notNull(),
    imageUrl: text("image_url").notNull(), // We'll store the base64 or URL string here
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const chatImages = pgTable("chat_images", {
    id: uuid("id").defaultRandom().primaryKey(),
    chatId: text("chat_id").notNull().references(() => chats.id, { onDelete: "cascade" }),
    filePath: text("file_path").notNull(),
    base64Data: text("base64_data").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Hacking Section Tables ──────────────────────────────────────────────────
// Mirrors chats / messages / chatSnapshots but stored in separate tables
// so hacking history is completely isolated from the main website-builder chat.

export const hackingChats = pgTable("hacking_chats", {
    id: text("id").primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: text("title").default("New Hacking Chat"),
    description: text("description"),
    model: text("model"),
    provider: text("provider"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const hackingMessages = pgTable("hacking_messages", {
    id: text("id").primaryKey(),
    chatId: text("chat_id").notNull().references(() => hackingChats.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    content: text("content"),
    parts: jsonb("parts").default("[]"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const hackingChatSnapshots = pgTable("hacking_chat_snapshots", {
    id: uuid("id").defaultRandom().primaryKey(),
    chatId: text("chat_id").notNull().references(() => hackingChats.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    files: jsonb("files").default("{}"),
    summary: text("summary"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Stores screenshots taken by the AI browser agent in Neon.
// Using text (base64) so no filesystem is needed — works in any deployment.
export const hackingScreenshots = pgTable("hacking_screenshots", {
    id: uuid("id").defaultRandom().primaryKey(),
    imageData: text("image_data").notNull(),  // base64-encoded PNG
    sourceUrl: text("source_url"),            // the URL that was screenshotted
    mimeType: text("mime_type").default("image/png").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Workflow Automation Tables ──────────────────────────────────────────────

export const workflows = pgTable("workflows", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    chatId: text("chat_id").references(() => chats.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    status: text("status").default("draft").notNull(), // draft, published, archived
    thumbnailUrl: text("thumbnail_url"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const workflowVersions = pgTable("workflow_versions", {
    id: uuid("id").defaultRandom().primaryKey(),
    workflowId: uuid("workflow_id").notNull().references(() => workflows.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    nodes: jsonb("nodes").default("[]").notNull(),
    edges: jsonb("edges").default("[]").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const workflowExecutions = pgTable("workflow_executions", {
    id: uuid("id").defaultRandom().primaryKey(),
    workflowId: uuid("workflow_id").notNull().references(() => workflows.id, { onDelete: "cascade" }),
    versionId: uuid("version_id").notNull().references(() => workflowVersions.id, { onDelete: "cascade" }),
    status: text("status").notNull(), // pending, running, paused, completed, failed
    startedAt: timestamp("started_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
    errorLogs: text("error_logs"),
    context: jsonb("context").default("{}"),
    creditsUsed: integer("credits_used").default(0),
});

export const workflowExecutionLogs = pgTable("workflow_execution_logs", {
    id: uuid("id").defaultRandom().primaryKey(),
    executionId: uuid("execution_id").notNull().references(() => workflowExecutions.id, { onDelete: "cascade" }),
    stepId: text("step_id").notNull(),
    status: text("status").notNull(), // pending, success, failed
    input: jsonb("input"),
    output: jsonb("output"),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
});

export const workflowJobs = pgTable("workflow_jobs", {
    id: uuid("id").defaultRandom().primaryKey(),
    workflowId: uuid("workflow_id").notNull().references(() => workflows.id, { onDelete: "cascade" }),
    executionId: uuid("execution_id").notNull().references(() => workflowExecutions.id, { onDelete: "cascade" }),
    stepId: text("step_id").notNull(),
    status: text("status").default("pending").notNull(), // pending, running, completed, failed
    runAt: timestamp("run_at").defaultNow().notNull(),
    retries: integer("retries").default(0).notNull(),
    payload: jsonb("payload"),
    error: text("error"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const falborSiteFiles = pgTable("falbor_site_files", {
    id: uuid("id").defaultRandom().primaryKey(),
    subdomain: text("subdomain").notNull().unique(),
    chatId: text("chat_id").notNull(),
    files: jsonb("files").notNull().default("{}"), // { "/index.html": "...", "/style.css": "..." }
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const mcpConnections = pgTable("mcp_connections", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    connectorId: text("connector_id").notNull(),
    name: text("name").notNull(),
    config: jsonb("config").default("{}"),
    status: text("status").default("active"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Analyzed Reports (Validation Pages) ────────────────────────────────────

export const analyzedReports = pgTable("analyzed_reports", {
    id: text("id").primaryKey(), // We can use short IDs for shareable links, e.g. "abc123"
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    chatId: text("chat_id").references(() => chats.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    problem: text("problem"),
    targetAudience: text("target_audience"),
    isPublic: boolean("is_public").default(false).notNull(),
    rawAnalysis: text("raw_analysis"),
    rawResources: text("raw_resources"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const analyzedFeedbacks = pgTable("analyzed_feedbacks", {
    id: uuid("id").defaultRandom().primaryKey(),
    reportId: text("report_id").notNull().references(() => analyzedReports.id, { onDelete: "cascade" }),
    wouldUse: boolean("would_use").notNull(),
    feedbackText: text("feedback_text"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sourcesInvestigations = pgTable("sources_investigations", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    query: text("query").notNull(),
    state: jsonb("state").default("{}").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── StayUp SDK Tables ────────────────────────────────────────────────────────

export const stayupProjects = pgTable("stayup_projects", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    apiKey: text("api_key").notNull().unique(),
    allowedOrigins: jsonb("allowed_origins").default("[]"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const stayupIssues = pgTable("stayup_issues", {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id").notNull().references(() => stayupProjects.id, { onDelete: "cascade" }),
    fingerprint: text("fingerprint").notNull(),
    status: text("status").default("unresolved").notNull(), // unresolved, resolved, ignored
    severity: text("severity").default("error").notNull(), // debug, info, warning, error, critical
    title: text("title").notNull(),
    message: text("message"),
    environment: text("environment").default("production"),
    eventCount: integer("event_count").default(0).notNull(),
    firstSeen: timestamp("first_seen").defaultNow().notNull(),
    lastSeen: timestamp("last_seen").defaultNow().notNull(),
    aiAnalysis: jsonb("ai_analysis"), // Stores: explanation, rootCause, affectedComponent, evidence, recommendedFix, stepByStepInstructions, confidenceLevel, aiPrompt
    aiAnalyzedAt: timestamp("ai_analyzed_at"),
});

export const stayupEvents = pgTable("stayup_events", {
    id: uuid("id").defaultRandom().primaryKey(),
    issueId: uuid("issue_id").notNull().references(() => stayupIssues.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").notNull().references(() => stayupProjects.id, { onDelete: "cascade" }),
    stacktrace: text("stacktrace"),
    browserInfo: jsonb("browser_info").default("{}"),
    url: text("url"),
    method: text("method"),
    metadata: jsonb("metadata").default("{}"),
    timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const stayupTeams = pgTable("stayup_teams", {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const stayupTeamMembers = pgTable("stayup_team_members", {
    id: uuid("id").defaultRandom().primaryKey(),
    teamId: uuid("team_id").notNull().references(() => stayupTeams.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    role: text("role").default("member").notNull(), // owner, admin, member
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const stayupHealthScans = pgTable("stayup_health_scans", {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id").notNull().references(() => stayupProjects.id, { onDelete: "cascade" }),
    summary: text("summary").notNull(),
    status: text("status").default("healthy").notNull(), // healthy, warning, critical
    details: jsonb("details").default("{}"), // Stores full report
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const stayupNotificationRules = pgTable("stayup_notification_rules", {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id").notNull().references(() => stayupProjects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    severityFilters: jsonb("severity_filters").default("[]"), // array of severities to trigger on
    environmentFilters: jsonb("environment_filters").default("[]"), // array of environments
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const stayupNotifications = pgTable("stayup_notifications", {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id").notNull().references(() => stayupProjects.id, { onDelete: "cascade" }),
    issueId: uuid("issue_id").references(() => stayupIssues.id, { onDelete: "set null" }), // Optional link to specific issue
    title: text("title").notNull(),
    message: text("message").notNull(),
    severity: text("severity").notNull(),
    isRead: boolean("is_read").default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Visual Editor Tables ────────────────────────────────────────────────────────

export const veAgencies = pgTable("ve_agencies", {
    id: uuid("id").defaultRandom().primaryKey(),
    connectAccountId: text("connect_account_id").default(""),
    customerId: text("customer_id").default(""),
    name: text("name").notNull(),
    agencyLogo: text("agency_logo").notNull(),
    companyEmail: text("company_email").notNull(),
    companyPhone: text("company_phone").notNull(),
    whiteLabel: boolean("white_label").default(true).notNull(),
    address: text("address").notNull(),
    city: text("city").notNull(),
    zipCode: text("zip_code").notNull(),
    state: text("state").notNull(),
    country: text("country").notNull(),
    goal: integer("goal").default(5).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const veSubAccounts = pgTable("ve_sub_accounts", {
    id: uuid("id").defaultRandom().primaryKey(),
    connectAccountId: text("connect_account_id").default(""),
    paypalClientId: text("paypal_client_id").default(""),
    name: text("name").notNull(),
    subAccountLogo: text("sub_account_logo").notNull(),
    companyEmail: text("company_email").notNull(),
    companyPhone: text("company_phone").notNull(),
    goal: integer("goal").default(5).notNull(),
    address: text("address").notNull(),
    city: text("city").notNull(),
    zipCode: text("zip_code").notNull(),
    state: text("state").notNull(),
    country: text("country").notNull(),
    agencyId: uuid("agency_id").notNull().references(() => veAgencies.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const vePermissions = pgTable("ve_permissions", {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(), // Should relate to users.email
    subAccountId: uuid("sub_account_id").notNull().references(() => veSubAccounts.id, { onDelete: "cascade" }),
    access: boolean("access").notNull(),
});

export const veTags = pgTable("ve_tags", {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    color: text("color").notNull(),
    subAccountId: uuid("sub_account_id").notNull().references(() => veSubAccounts.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const vePipelines = pgTable("ve_pipelines", {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    subAccountId: uuid("sub_account_id").notNull().references(() => veSubAccounts.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const veLanes = pgTable("ve_lanes", {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    pipelineId: uuid("pipeline_id").notNull().references(() => vePipelines.id, { onDelete: "cascade" }),
    order: integer("order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const veTickets = pgTable("ve_tickets", {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    laneId: uuid("lane_id").notNull().references(() => veLanes.id, { onDelete: "cascade" }),
    order: integer("order").default(0).notNull(),
    value: decimal("value"),
    description: text("description"),
    customerId: uuid("customer_id"), // refers to ve_contacts
    assignedUserId: uuid("assigned_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const veTriggers = pgTable("ve_triggers", {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    type: text("type").notNull(),
    subAccountId: uuid("sub_account_id").notNull().references(() => veSubAccounts.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const veAutomations = pgTable("ve_automations", {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    triggerId: uuid("trigger_id").references(() => veTriggers.id, { onDelete: "cascade" }),
    published: boolean("published").default(false).notNull(),
    subAccountId: uuid("sub_account_id").notNull().references(() => veSubAccounts.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const veActions = pgTable("ve_actions", {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    type: text("type").notNull(),
    automationId: uuid("automation_id").notNull().references(() => veAutomations.id, { onDelete: "cascade" }),
    order: integer("order").notNull(),
    laneId: text("lane_id").default("0").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const veFunnels = pgTable("ve_funnels", {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    published: boolean("published").default(false).notNull(),
    subDomainName: text("sub_domain_name").unique(),
    favicon: text("favicon"),
    liveProducts: text("live_products").default("[]"),
    subAccountId: uuid("sub_account_id").notNull().references(() => veSubAccounts.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const veFunnelPages = pgTable("ve_funnel_pages", {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    pathName: text("path_name").default("").notNull(),
    visits: integer("visits").default(0).notNull(),
    content: text("content"),
    order: integer("order").notNull(),
    previewImage: text("preview_image"),
    funnelId: uuid("funnel_id").notNull().references(() => veFunnels.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const veFunnelsProduct = pgTable("ve_funnels_product", {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    price: text("price").notNull(),
    priceId: text("price_id").notNull(),
    subAccountId: uuid("sub_account_id").notNull().references(() => veSubAccounts.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const veContacts = pgTable("ve_contacts", {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    subAccountId: uuid("sub_account_id").notNull().references(() => veSubAccounts.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// --- RELATIONS ---
export const usersRelations = relations(users, ({ one, many }) => ({
    Agency: one(veAgencies, { fields: [users.agencyId], references: [veAgencies.id] }),
    Permissions: many(vePermissions),
}));

export const veAgenciesRelations = relations(veAgencies, ({ many }) => ({
    SubAccount: many(veSubAccounts),
    Users: many(users),
}));

export const veSubAccountsRelations = relations(veSubAccounts, ({ one, many }) => ({
    Agency: one(veAgencies, { fields: [veSubAccounts.agencyId], references: [veAgencies.id] }),
    Permissions: many(vePermissions),
    Funnels: many(veFunnels),
    Contact: many(veContacts),
    Tags: many(veTags),
}));

export const vePermissionsRelations = relations(vePermissions, ({ one }) => ({
    User: one(users, { fields: [vePermissions.email], references: [users.email] }),
    SubAccount: one(veSubAccounts, { fields: [vePermissions.subAccountId], references: [veSubAccounts.id] }),
}));

export const veTagsRelations = relations(veTags, ({ one }) => ({
    SubAccount: one(veSubAccounts, { fields: [veTags.subAccountId], references: [veSubAccounts.id] }),
}));

export const veFunnelsRelations = relations(veFunnels, ({ one, many }) => ({
    SubAccount: one(veSubAccounts, { fields: [veFunnels.subAccountId], references: [veSubAccounts.id] }),
    FunnelPages: many(veFunnelPages),
}));

export const veFunnelPagesRelations = relations(veFunnelPages, ({ one }) => ({
    Funnel: one(veFunnels, { fields: [veFunnelPages.funnelId], references: [veFunnels.id] }),
}));

export const veFunnelsProductRelations = relations(veFunnelsProduct, ({ one }) => ({
    SubAccount: one(veSubAccounts, { fields: [veFunnelsProduct.subAccountId], references: [veSubAccounts.id] }),
}));

export const veContactsRelations = relations(veContacts, ({ one, many }) => ({
    SubAccount: one(veSubAccounts, { fields: [veContacts.subAccountId], references: [veSubAccounts.id] }),
    Ticket: many(veTickets),
}));

export const veTicketsRelations = relations(veTickets, ({ one }) => ({
    Contact: one(veContacts, { fields: [veTickets.customerId], references: [veContacts.id] }),
}));

export const chatFoldersRelations = relations(chatFolders, ({ one, many }) => ({
    User: one(users, { fields: [chatFolders.userId], references: [users.id] }),
    Chats: many(chats),
}));

export const chatsRelations = relations(chats, ({ one }) => ({
    User: one(users, { fields: [chats.userId], references: [users.id] }),
    Folder: one(chatFolders, { fields: [chats.folderId], references: [chatFolders.id] }),
}));

// Legacy files table (kept to prevent data loss during migrations)
export const files = pgTable("files", {
    id: uuid("id").defaultRandom().primaryKey(),
    chatId: text("chat_id"),
    path: text("path"),
    content: text("content"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});
// Extracted from live DB to prevent Drizzle dropping them
export const globalSettings = pgTable("global_settings", {
    id: serial("id").primaryKey(),
    riskyPathKeywords: text("risky_path_keywords"),
    largePrThreshold: integer("large_pr_threshold"),
    missingTests: boolean("missing_tests"),
    dependencyChange: boolean("dependency_change"),
    reportFormat: text("report_format"),
    includeLowRisk: boolean("include_low_risk"),
    enablePostToGithub: boolean("enable_post_to_github"),
    githubAppInstallationId: text("github_app_installation_id"),
});

export const repositories = pgTable("repositories", {
    id: uuid("id").primaryKey(),
    name: text("name"),
    fullName: text("full_name"),
    githubId: text("github_id"),
    connectedAt: timestamp("connected_at"),
});

export const adrRules = pgTable("adr_rules", {
    id: uuid("id").primaryKey(),
    repositoryId: uuid("repository_id"),
    title: text("title"),
    description: text("description"),
    severity: text("severity"),
    createdAt: timestamp("created_at"),
});

export const prReports = pgTable("pr_reports", {
    id: uuid("id").primaryKey(),
    repositoryId: uuid("repository_id"),
    prNumber: text("pr_number"),
    title: text("title"),
    riskLevel: text("risk_level"),
    summary: text("summary"),
    markdownReport: text("markdown_report"),
    createdAt: timestamp("created_at"),
});
export const creatorProcessingLogs = pgTable("creator_processing_logs", {
    id: text("id").primaryKey(),
    streamId: text("stream_id").notNull(),
    level: text("level").default("info").notNull(),
    message: text("message").notNull(),
    meta: jsonb("meta"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const creatorAutomationSettings = pgTable("creator_automation_settings", {
    id: text("id").primaryKey(),
    userId: uuid("user_id").notNull(),
    autoPublish: boolean("auto_publish").default(false).notNull(),
    manualApproval: boolean("manual_approval").default(true).notNull(),
    maxClipsPerStream: integer("max_clips_per_stream").default(3).notNull(),
    minClipScore: integer("min_clip_score").default(70).notNull(),
    language: text("language").default("en").notNull(),
    captionStyle: text("caption_style").default("modern_bold").notNull(),
    uploadPrivacy: text("upload_privacy").default("unlisted").notNull(),
    bannedTopics: jsonb("banned_topics"),
    sourceType: text("source_type").default("own").notNull(),
    targetChannelUrl: text("target_channel_url"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const creatorStreams = pgTable("creator_streams", {
    id: text("id").primaryKey(),
    userId: uuid("user_id").notNull(),
    platform: text("platform").notNull(),
    externalStreamId: text("external_stream_id").notNull(),
    title: text("title"),
    status: text("status").default("detected_live").notNull(),
    vodUrl: text("vod_url"),
    durationSeconds: integer("duration_seconds"),
    startedAt: timestamp("started_at"),
    endedAt: timestamp("ended_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const creatorClips = pgTable("creator_clips", {
    id: text("id").primaryKey(),
    streamId: text("stream_id").notNull(),
    userId: uuid("user_id").notNull(),
    title: text("title").notNull(),
    hookText: text("hook_text"),
    description: text("description"),
    hashtags: jsonb("hashtags"),
    startTime: integer("start_time").notNull(),
    endTime: integer("end_time").notNull(),
    score: integer("score").notNull(),
    contentType: text("content_type").notNull(),
    videoUrl: text("video_url"),
    thumbnailUrl: text("thumbnail_url"),
    status: text("status").default("generated").notNull(),
    riskFlags: jsonb("risk_flags"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const elementComments = pgTable("element_comments", {
    id: text("id").primaryKey(),
    chatId: text("chat_id"),
    elementInfo: jsonb("element_info").notNull(),
    position: jsonb("position").notNull(),
    messages: jsonb("messages").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const creatorConnectedAccounts = pgTable("creator_connected_accounts", {
    id: text("id").primaryKey(),
    userId: uuid("user_id").notNull(),
    platform: text("platform").notNull(),
    platformUserId: text("platform_user_id").notNull(),
    platformUsername: text("platform_username").notNull(),
    platformEmail: text("platform_email"),
    accessTokenEncrypted: text("access_token_encrypted").notNull(),
    refreshTokenEncrypted: text("refresh_token_encrypted"),
    tokenExpiresAt: timestamp("token_expires_at"),
    autoPublish: boolean("auto_publish").default(true).notNull(),
    postsPerDay: integer("posts_per_day").default(3).notNull(),
    intervalMinutes: integer("interval_minutes").default(180).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export const workspaces = pgTable("workspaces", {
    id: varchar("id", { length: 255 }).primaryKey(),
    userId: uuid("user_id").notNull(),
    name: varchar("name", { length: 255 }),
    domain: varchar("domain", { length: 255 }),
    onboardingCompleted: boolean("onboarding_completed").default(false),
    contextPrompt: text("context_prompt"),
    intelligenceData: jsonb("intelligence_data"),
    sourcesData: jsonb("sources_data"),
    trendsData: jsonb("trends_data"),
    canvasCards: jsonb("canvas_cards"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const workspaceMembers = pgTable("workspace_members", {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: varchar("workspace_id", { length: 255 }).notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 50 }).default("editor").notNull(), // 'owner' | 'admin' | 'editor' | 'viewer'
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const workspaceInvites = pgTable("workspace_invites", {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: varchar("workspace_id", { length: 255 }).notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 255 }).notNull().unique(),
    type: varchar("type", { length: 50 }).notNull(), // 'email' | 'link'
    email: text("email"),
    nickname: text("nickname"),
    role: varchar("role", { length: 50 }).default("editor").notNull(),
    maxUses: integer("max_uses"), // null or 0 for unlimited
    usedCount: integer("used_count").default(0).notNull(),
    allowedDomain: text("allowed_domain"),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const workspaceSources = pgTable("workspace_sources", {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: varchar("workspace_id", { length: 255 }).notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    platform: text("platform").notNull(),
    url: text("url").notNull(),
    relevanceScore: integer("relevance_score").default(85).notNull(),
    audienceSize: text("audience_size").default("10k+"),
    status: text("status").default("active").notNull(),
    strategy: text("strategy"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const sourcePosts = pgTable("source_posts", {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: varchar("workspace_id", { length: 255 }).notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    sourceId: uuid("source_id").notNull().references(() => workspaceSources.id, { onDelete: "cascade" }),
    platform: text("platform").notNull(),
    title: text("title").notNull(),
    hook: text("hook"),
    body: text("body").notNull(),
    callToAction: text("call_to_action"),
    hashtags: jsonb("hashtags").default("[]"),
    status: text("status").default("draft").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const workspaceSourceFolders = pgTable("workspace_source_folders", {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: varchar("workspace_id", { length: 255 }).notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color").default("#8B5CF6"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const workspaceSourceChats = pgTable("workspace_source_chats", {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: varchar("workspace_id", { length: 255 }).notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    folderId: uuid("folder_id").references(() => workspaceSourceFolders.id, { onDelete: "set null" }),
    sourceId: uuid("source_id").references(() => workspaceSources.id, { onDelete: "cascade" }),
    chatId: text("chat_id").notNull(),
    title: text("title").notNull(),
    messages: jsonb("messages").default("[]"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export const products = pgTable("products", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    workspaceId: varchar("workspace_id", { length: 255 }),
    name: text("name").notNull(),
    description: text("description"),
    isActive: boolean("is_active").default(true).notNull(),
    lastActiveAt: timestamp("last_active_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const competitors = pgTable("competitors", {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    websiteUrl: text("website_url"),
    strengths: text("strengths"),
    weaknesses: text("weaknesses"),
    featureDifferences: text("feature_differences"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const productIdeas = pgTable("product_ideas", {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    reasoning: text("reasoning"),
    status: text("status").default('new').notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const productUpdates = pgTable("product_updates", {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    content: jsonb("content").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

import { z } from 'zod';

export const agentSessions = pgTable("agent_sessions", {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: varchar("workspace_id", { length: 255 }).notNull(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    agentId: text("agent_id"),
    title: text("title").default("Onboarding").notNull(),
    events: jsonb("events").default("[]").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const agents = pgTable("agents", {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: varchar("workspace_id", { length: 255 }).notNull(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    role: text("role"),
    goal: text("goal"),
    instructions: text("instructions"),
    memory: text("memory"),
    tools: jsonb("tools").default("[]"),
    knowledge: jsonb("knowledge").default("[]"),
    permissions: jsonb("permissions").default("[]"),
    model: text("model").default("gpt-4o"),
    avatarUrl: text("avatar_url"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

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
    missingInformation: z.array(z.string()).describe('Specific questions to ask the user to fill in critical gaps. Only questions that materially change a decision. Do NOT invent data.'),

    audienceInterestGraph: z.array(z.object({
        dateLabel: z.string().describe('Short date label (e.g. "09-10")'),
        interestScore: z.number().min(0).max(100).describe('Interest score 0-100')
    })).optional().describe('Data for plotting a bar chart over a 6-period span, showing audience interest trend.'),

    healthTrendGraph: z.array(z.object({
        dateLabel: z.string().describe('Short date label'),
        score: z.number().min(0).max(100)
    })).optional().describe('Data for plotting a line chart over 6 periods, showing health trend.'),

    validationRateGraph: z.array(z.object({
        dateLabel: z.string().describe('Short date label'),
        score: z.number().min(0).max(100)
    })).optional().describe('Data for plotting a line chart over 6 periods, showing validation rate.'),

    funnelDropoffGraph: z.array(z.object({
        dateLabel: z.string().describe('Short date label'),
        score: z.number().min(0).max(100)
    })).optional().describe('Data for plotting a line chart over 6 periods, showing funnel drop-off metric.')
});

export const googleAdsConnections = pgTable("google_ads_connections", {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: varchar("workspace_id", { length: 255 }).notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    refreshToken: text("refresh_token").notNull(),
    customerId: text("customer_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const blogPosts = pgTable("blog_posts", {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: varchar("workspace_id", { length: 255 }).notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("Untitled Blog Post"),
    content: text("content").notNull().default(""),
    isPublished: boolean("is_published").default(false).notNull(),
    publishedSlug: text("published_slug"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const productDecks = pgTable("product_decks", {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: varchar("workspace_id", { length: 255 }).notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("Product Deck"),
    slides: jsonb("slides").notNull().default("[]"),
    isPublished: boolean("is_published").default(false).notNull(),
    publishedSlug: text("published_slug"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const workspaceSignups = pgTable("workspace_signups", {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: varchar("workspace_id", { length: 255 }).notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    userEmail: text("user_email"),
    metadata: jsonb("metadata").default("{}"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const claimedMilestones = pgTable("claimed_milestones", {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: varchar("workspace_id", { length: 255 }).notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    questId: integer("quest_id").notNull(),
    rewardCents: integer("reward_cents").notNull(),
    claimedAt: timestamp("claimed_at").defaultNow().notNull(),
});

export const workspaceBuilds = pgTable("workspace_builds", {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: varchar("workspace_id", { length: 255 }).notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 20 }).default("pending").notNull(),
    currentStage: varchar("current_stage", { length: 50 }),
    lastSuccessfulStage: varchar("last_successful_stage", { length: 50 }),
    retryCount: integer("retry_count").default(0).notNull(),
    errorMessage: text("error_message"),
    leaseOwner: varchar("lease_owner", { length: 64 }),
    leaseExpiresAt: timestamp("lease_expires_at"),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
    workspaceIdx: uniqueIndex("workspace_builds_workspace_idx").on(t.workspaceId),
    statusIdx: index("workspace_builds_status_idx").on(t.status),
}));

export const workspaceBuildStages = pgTable("workspace_build_stages", {
    id: uuid("id").defaultRandom().primaryKey(),
    buildId: uuid("build_id").notNull().references(() => workspaceBuilds.id, { onDelete: "cascade" }),
    workspaceId: varchar("workspace_id", { length: 255 }).notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    stageKey: varchar("stage_key", { length: 50 }).notNull(),
    position: integer("position").notNull(),
    status: varchar("status", { length: 20 }).default("pending").notNull(),
    attempts: integer("attempts").default(0).notNull(),
    errorMessage: text("error_message"),
    result: jsonb("result"),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
    buildStageIdx: uniqueIndex("workspace_build_stages_build_stage_idx").on(t.buildId, t.stageKey),
    workspaceIdx: index("workspace_build_stages_workspace_idx").on(t.workspaceId),
}));

export const workspaceProductProfiles = pgTable("workspace_product_profiles", {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: varchar("workspace_id", { length: 255 }).notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    productName: text("product_name"),
    domain: text("domain"),
    summary: text("summary"),
    category: text("category"),
    icp: text("icp"),
    problem: text("problem"),
    pricing: text("pricing"),
    positioning: text("positioning"),
    maturity: text("maturity"),
    useCases: jsonb("use_cases").default("[]"),
    features: jsonb("features").default("[]"),
    knownCompetitors: jsonb("known_competitors").default("[]"),
    conversionBlockers: jsonb("conversion_blockers").default("[]"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
    workspaceIdx: uniqueIndex("workspace_product_profiles_workspace_idx").on(t.workspaceId),
}));

export const buyerQuestions = pgTable("buyer_questions", {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: varchar("workspace_id", { length: 255 }).notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    buildId: uuid("build_id").references(() => workspaceBuilds.id, { onDelete: "set null" }),
    question: text("question").notNull(),
    questionHash: varchar("question_hash", { length: 64 }).notNull(),
    category: varchar("category", { length: 30 }).notNull(),
    intent: varchar("intent", { length: 20 }).default("medium").notNull(),
    audience: text("audience"),
    rationale: text("rationale"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
    workspaceHashIdx: uniqueIndex("buyer_questions_workspace_hash_idx").on(t.workspaceId, t.questionHash),
}));

export const modelRuns = pgTable("model_runs", {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: varchar("workspace_id", { length: 255 }).notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    questionId: uuid("question_id").notNull().references(() => buyerQuestions.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 20 }).notNull(),
    model: varchar("model", { length: 100 }).notNull(),
    status: varchar("status", { length: 20 }).default("pending").notNull(),
    attempts: integer("attempts").default(0).notNull(),
    rawResponse: text("raw_response"),
    errorMessage: text("error_message"),
    latencyMs: integer("latency_ms"),
    analysisStatus: varchar("analysis_status", { length: 20 }).default("pending").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
    questionProviderIdx: uniqueIndex("model_runs_question_provider_idx").on(t.questionId, t.provider),
    workspaceIdx: index("model_runs_workspace_idx").on(t.workspaceId),
}));

export const aiAnswerAnalyses = pgTable("ai_answer_analyses", {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: varchar("workspace_id", { length: 255 }).notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    modelRunId: uuid("model_run_id").notNull().references(() => modelRuns.id, { onDelete: "cascade" }),
    productMentioned: boolean("product_mentioned").default(false).notNull(),
    productRecommended: boolean("product_recommended").default(false).notNull(),
    productPosition: integer("product_position"),
    describedProduct: text("described_product"),
    descriptionAccurate: boolean("description_accurate"),
    pricingAccurate: boolean("pricing_accurate"),
    statusAccurate: boolean("status_accurate"),
    attributedFeatures: jsonb("attributed_features").default("[]"),
    misunderstandsProduct: boolean("misunderstands_product").default(false).notNull(),
    recognition: jsonb("recognition").default("{}"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
    runIdx: uniqueIndex("ai_answer_analyses_run_idx").on(t.modelRunId),
    workspaceIdx: index("ai_answer_analyses_workspace_idx").on(t.workspaceId),
}));

export const aiAnswerBrands = pgTable("ai_answer_brands", {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: varchar("workspace_id", { length: 255 }).notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    analysisId: uuid("analysis_id").notNull().references(() => aiAnswerAnalyses.id, { onDelete: "cascade" }),
    brandName: text("brand_name").notNull(),
    domain: text("domain"),
    position: integer("position").notNull(),
    isUserProduct: boolean("is_user_product").default(false).notNull(),
    reason: text("reason"),
}, (t) => ({
    workspaceBrandIdx: index("ai_answer_brands_workspace_brand_idx").on(t.workspaceId, t.brandName),
    analysisIdx: index("ai_answer_brands_analysis_idx").on(t.analysisId),
}));

export const workspaceCompetitorProfiles = pgTable("workspace_competitor_profiles", {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: varchar("workspace_id", { length: 255 }).notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    brandName: text("brand_name").notNull(),
    domain: text("domain"),
    positioning: jsonb("positioning").default("{}"),
    pricing: jsonb("pricing").default("{}"),
    features: jsonb("features").default("[]"),
    audience: jsonb("audience").default("{}"),
    whyRecommends: jsonb("why_recommends").default("[]"),
    headToHead: jsonb("head_to_head").default("{}"),
    sources: jsonb("sources").default("[]"),
    newContent: jsonb("new_content").default("[]"),
    messagingChanges: jsonb("messaging_changes").default("[]"),
    communityPresence: jsonb("community_presence").default("[]"),
    ads: jsonb("ads").default("{}"),
    timelineEvents: jsonb("timeline_events").default("[]"),
    hasEvidence: boolean("has_evidence").default(true).notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
    workspaceCompetitorKeyIdx: uniqueIndex("workspace_competitor_key_idx").on(t.workspaceId, t.brandName),
}));

export const aiAnswerSources = pgTable("ai_answer_sources", {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: varchar("workspace_id", { length: 255 }).notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    analysisId: uuid("analysis_id").notNull().references(() => aiAnswerAnalyses.id, { onDelete: "cascade" }),
    domain: text("domain").notNull(),
    url: text("url"),
    sourceType: varchar("source_type", { length: 30 }).notNull(),
    isFirstParty: boolean("is_first_party").default(false).notNull(),
    isCommunity: boolean("is_community").default(false).notNull(),
    discussesProduct: boolean("discusses_product").default(false).notNull(),
    discussesProblem: boolean("discusses_problem").default(false).notNull(),
    mentionsCompetitors: boolean("mentions_competitors").default(false).notNull(),
    isCurrent: boolean("is_current"),
}, (t) => ({
    workspaceDomainIdx: index("ai_answer_sources_workspace_domain_idx").on(t.workspaceId, t.domain),
    analysisIdx: index("ai_answer_sources_analysis_idx").on(t.analysisId),
}));

export const workspaceMetricSnapshots = pgTable("workspace_metric_snapshots", {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: varchar("workspace_id", { length: 255 }).notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    buildId: uuid("build_id").references(() => workspaceBuilds.id, { onDelete: "set null" }),
    visibility: real("visibility").notNull(),
    shareOfVoice: real("share_of_voice").notNull(),
    averagePosition: real("average_position"),
    productUnderstanding: real("product_understanding").notNull(),
    answersCount: integer("answers_count").notNull(),
    breakdown: jsonb("breakdown").default("{}"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
    workspaceTimeIdx: index("workspace_metric_snapshots_workspace_time_idx").on(t.workspaceId, t.createdAt),
}));

export const questionCriticality = pgTable("question_criticality", {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: varchar("workspace_id", { length: 255 }).notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    questionId: uuid("question_id").notNull().references(() => buyerQuestions.id, { onDelete: "cascade" }),
    intentWeight: real("intent_weight").notNull(),
    competitivePressure: real("competitive_pressure").notNull(),
    gapSeverity: real("gap_severity").notNull(),
    acquisitionSignal: real("acquisition_signal").notNull(),
    modelAgreement: real("model_agreement").notNull(),
    score: real("score").notNull(),
    level: varchar("level", { length: 10 }).notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
    questionIdx: uniqueIndex("question_criticality_question_idx").on(t.questionId),
    workspaceIdx: index("question_criticality_workspace_idx").on(t.workspaceId),
}));

export const acquisitionOpportunities = pgTable("acquisition_opportunities", {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: varchar("workspace_id", { length: 255 }).notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    buildId: uuid("build_id").references(() => workspaceBuilds.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    horizon: varchar("horizon", { length: 10 }).notNull(),
    channel: text("channel"),
    observedEvidence: jsonb("observed_evidence").default("[]"),
    recommendation: text("recommendation").notNull(),
    expectedOutcome: text("expected_outcome"),
    measurement: text("measurement"),
    reach: real("reach").notNull(),
    intent: real("intent").notNull(),
    icpRelevance: real("icp_relevance").notNull(),
    competitiveGap: real("competitive_gap").notNull(),
    effort: real("effort").notNull(),
    confidence: real("confidence").notNull(),
    priorityScore: real("priority_score").notNull(),
    relatedQuestionIds: jsonb("related_question_ids").default("[]"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
    workspacePriorityIdx: index("acquisition_opportunities_workspace_priority_idx").on(t.workspaceId, t.priorityScore),
}));