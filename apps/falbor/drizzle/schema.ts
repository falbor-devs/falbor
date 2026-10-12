import { pgTable, uuid, text, timestamp, foreignKey, boolean, jsonb, integer, unique, numeric, serial } from "drizzle-orm/pg-core"
  import { sql } from "drizzle-orm"




export const hackingScreenshots = pgTable("hacking_screenshots", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	imageData: text("image_data").notNull(),
	sourceUrl: text("source_url"),
	mimeType: text("mime_type").default('image/png').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const analyzedReports = pgTable("analyzed_reports", {
	id: text("id").primaryKey().notNull(),
	userId: uuid("user_id"),
	chatId: text("chat_id"),
	title: text("title").notNull(),
	problem: text("problem"),
	targetAudience: text("target_audience"),
	isPublic: boolean("is_public").default(false).notNull(),
	rawAnalysis: text("raw_analysis"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	rawResources: text("raw_resources"),
},
(table) => {
	return {
		analyzedReportsChatIdChatsIdFk: foreignKey({
			columns: [table.chatId],
			foreignColumns: [chats.id],
			name: "analyzed_reports_chat_id_chats_id_fk"
		}).onDelete("set null"),
		analyzedReportsUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "analyzed_reports_user_id_users_id_fk"
		}).onDelete("set null"),
	}
});

export const agentProspects = pgTable("agent_prospects", {
  id: text("id").primaryKey().notNull(),
  workspaceId: text("workspace_id").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  company: text("company").notNull(),
  matchReason: text("match_reason"),
  status: text("status").notNull(),
  messagePreview: text("message_preview"),
  sentAt: text("sent_at"),
  lastActivity: text("last_activity"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const chatImages = pgTable("chat_images", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	chatId: text("chat_id").notNull(),
	filePath: text("file_path").notNull(),
	base64Data: text("base64_data").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		chatImagesChatIdChatsIdFk: foreignKey({
			columns: [table.chatId],
			foreignColumns: [chats.id],
			name: "chat_images_chat_id_chats_id_fk"
		}).onDelete("cascade"),
	}
});

export const workflowExecutionLogs = pgTable("workflow_execution_logs", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	executionId: uuid("execution_id").notNull(),
	stepId: text("step_id").notNull(),
	status: text("status").notNull(),
	input: jsonb("input"),
	output: jsonb("output"),
	startedAt: timestamp("started_at", { mode: 'string' }).defaultNow().notNull(),
	completedAt: timestamp("completed_at", { mode: 'string' }),
},
(table) => {
	return {
		workflowExecutionLogsExecutionIdWorkflowExecutionsIdFk: foreignKey({
			columns: [table.executionId],
			foreignColumns: [workflowExecutions.id],
			name: "workflow_execution_logs_execution_id_workflow_executions_id_fk"
		}).onDelete("cascade"),
	}
});

export const workflowVersions = pgTable("workflow_versions", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	workflowId: uuid("workflow_id").notNull(),
	version: integer("version").notNull(),
	nodes: jsonb("nodes").default([]).notNull(),
	edges: jsonb("edges").default([]).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		workflowVersionsWorkflowIdWorkflowsIdFk: foreignKey({
			columns: [table.workflowId],
			foreignColumns: [workflows.id],
			name: "workflow_versions_workflow_id_workflows_id_fk"
		}).onDelete("cascade"),
	}
});

export const workflowExecutions = pgTable("workflow_executions", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	workflowId: uuid("workflow_id").notNull(),
	versionId: uuid("version_id").notNull(),
	status: text("status").notNull(),
	startedAt: timestamp("started_at", { mode: 'string' }).defaultNow().notNull(),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	errorLogs: text("error_logs"),
	creditsUsed: integer("credits_used").default(0),
	context: jsonb("context").default({}),
},
(table) => {
	return {
		workflowExecutionsVersionIdWorkflowVersionsIdFk: foreignKey({
			columns: [table.versionId],
			foreignColumns: [workflowVersions.id],
			name: "workflow_executions_version_id_workflow_versions_id_fk"
		}).onDelete("cascade"),
		workflowExecutionsWorkflowIdWorkflowsIdFk: foreignKey({
			columns: [table.workflowId],
			foreignColumns: [workflows.id],
			name: "workflow_executions_workflow_id_workflows_id_fk"
		}).onDelete("cascade"),
	}
});

export const workflows = pgTable("workflows", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	name: text("name").notNull(),
	description: text("description"),
	status: text("status").default('draft').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	thumbnailUrl: text("thumbnail_url"),
	chatId: text("chat_id"),
},
(table) => {
	return {
		workflowsChatIdChatsIdFk: foreignKey({
			columns: [table.chatId],
			foreignColumns: [chats.id],
			name: "workflows_chat_id_chats_id_fk"
		}).onDelete("cascade"),
		workflowsUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "workflows_user_id_users_id_fk"
		}).onDelete("cascade"),
	}
});

export const mcpConnections = pgTable("mcp_connections", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	connectorId: text("connector_id").notNull(),
	name: text("name").notNull(),
	config: jsonb("config").default({}),
	status: text("status").default('active'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		mcpConnectionsUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "mcp_connections_user_id_users_id_fk"
		}).onDelete("cascade"),
	}
});

export const falborSiteFiles = pgTable("falbor_site_files", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	subdomain: text("subdomain").notNull(),
	chatId: text("chat_id").notNull(),
	files: jsonb("files").default({}).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		falborSiteFilesSubdomainUnique: unique("falbor_site_files_subdomain_unique").on(table.subdomain),
	}
});

export const workflowJobs = pgTable("workflow_jobs", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	workflowId: uuid("workflow_id").notNull(),
	executionId: uuid("execution_id").notNull(),
	stepId: text("step_id").notNull(),
	status: text("status").default('pending').notNull(),
	runAt: timestamp("run_at", { mode: 'string' }).defaultNow().notNull(),
	retries: integer("retries").default(0).notNull(),
	payload: jsonb("payload"),
	error: text("error"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		workflowJobsExecutionIdWorkflowExecutionsIdFk: foreignKey({
			columns: [table.executionId],
			foreignColumns: [workflowExecutions.id],
			name: "workflow_jobs_execution_id_workflow_executions_id_fk"
		}).onDelete("cascade"),
		workflowJobsWorkflowIdWorkflowsIdFk: foreignKey({
			columns: [table.workflowId],
			foreignColumns: [workflows.id],
			name: "workflow_jobs_workflow_id_workflows_id_fk"
		}).onDelete("cascade"),
	}
});

export const analyzedFeedbacks = pgTable("analyzed_feedbacks", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	reportId: text("report_id").notNull(),
	wouldUse: boolean("would_use").notNull(),
	feedbackText: text("feedback_text"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		analyzedFeedbacksReportIdAnalyzedReportsIdFk: foreignKey({
			columns: [table.reportId],
			foreignColumns: [analyzedReports.id],
			name: "analyzed_feedbacks_report_id_analyzed_reports_id_fk"
		}).onDelete("cascade"),
	}
});

export const users = pgTable("users", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	email: text("email").notNull(),
	passwordHash: text("password_hash"),
	displayName: text("display_name"),
	avatarUrl: text("avatar_url"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	bio: text("bio"),
	balance: integer("balance").default(600).notNull(),
	subscriptionTier: text("subscription_tier").default('free').notNull(),
	subscriptionExpiresAt: timestamp("subscription_expires_at", { mode: 'string' }),
	coverUrl: text("cover_url"),
	displayEmail: boolean("display_email").default(false).notNull(),
	instagramUrl: text("instagram_url"),
	linkedinUrl: text("linkedin_url"),
	twitterUrl: text("twitter_url"),
	customLinks: jsonb("custom_links").default([]),
	timezone: text("timezone"),
	location: text("location"),
	statusMessage: text("status_message"),
	skills: jsonb("skills").default([]),
	badges: jsonb("badges").default([]),
	stats: jsonb("stats").default({}),
	username: text("username"),
	profileApps: jsonb("profile_apps").default([]),
	isVerified: boolean("is_verified").default(true).notNull(),
	verificationCode: text("verification_code"),
	role: text("role").default('SUBACCOUNT_USER'),
	agencyId: uuid("agency_id"),
},
(table) => {
	return {
		usersEmailUnique: unique("users_email_unique").on(table.email),
		usersUsernameUnique: unique("users_username_unique").on(table.username),
	}
});

export const messages = pgTable("messages", {
	id: text("id").primaryKey().notNull(),
	chatId: text("chat_id").notNull(),
	role: text("role").notNull(),
	content: text("content"),
	parts: jsonb("parts").default([]),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	toolInvocations: jsonb("tool_invocations"),
	imageData: text("image_data"),
},
(table) => {
	return {
		messagesChatIdChatsIdFk: foreignKey({
			columns: [table.chatId],
			foreignColumns: [chats.id],
			name: "messages_chat_id_chats_id_fk"
		}).onDelete("cascade"),
	}
});

export const chatSnapshots = pgTable("chat_snapshots", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	chatId: text("chat_id").notNull(),
	userId: uuid("user_id").notNull(),
	files: jsonb("files").default({}),
	summary: text("summary"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		chatSnapshotsChatIdChatsIdFk: foreignKey({
			columns: [table.chatId],
			foreignColumns: [chats.id],
			name: "chat_snapshots_chat_id_chats_id_fk"
		}).onDelete("cascade"),
		chatSnapshotsUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "chat_snapshots_user_id_users_id_fk"
		}).onDelete("cascade"),
	}
});

export const sourcesInvestigations = pgTable("sources_investigations", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	query: text("query").notNull(),
	state: jsonb("state").default({}).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		sourcesInvestigationsUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "sources_investigations_user_id_users_id_fk"
		}).onDelete("cascade"),
	}
});

export const stayupEvents = pgTable("stayup_events", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	issueId: uuid("issue_id").notNull(),
	projectId: uuid("project_id").notNull(),
	stacktrace: text("stacktrace"),
	browserInfo: jsonb("browser_info").default({}),
	url: text("url"),
	method: text("method"),
	metadata: jsonb("metadata").default({}),
	timestamp: timestamp("timestamp", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		stayupEventsIssueIdStayupIssuesIdFk: foreignKey({
			columns: [table.issueId],
			foreignColumns: [stayupIssues.id],
			name: "stayup_events_issue_id_stayup_issues_id_fk"
		}).onDelete("cascade"),
		stayupEventsProjectIdStayupProjectsIdFk: foreignKey({
			columns: [table.projectId],
			foreignColumns: [stayupProjects.id],
			name: "stayup_events_project_id_stayup_projects_id_fk"
		}).onDelete("cascade"),
	}
});

export const templateReviews = pgTable("template_reviews", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	templateId: uuid("template_id").notNull(),
	userId: uuid("user_id").notNull(),
	rating: integer("rating").notNull(),
	content: text("content"),
	likes: integer("likes").default(0),
	dislikes: integer("dislikes").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		templateReviewsTemplateIdTemplatesIdFk: foreignKey({
			columns: [table.templateId],
			foreignColumns: [templates.id],
			name: "template_reviews_template_id_templates_id_fk"
		}).onDelete("cascade"),
		templateReviewsUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "template_reviews_user_id_users_id_fk"
		}).onDelete("cascade"),
	}
});

export const stayupProjects = pgTable("stayup_projects", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	name: text("name").notNull(),
	apiKey: text("api_key").notNull(),
	allowedOrigins: jsonb("allowed_origins").default([]),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		stayupProjectsUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "stayup_projects_user_id_users_id_fk"
		}).onDelete("cascade"),
		stayupProjectsApiKeyUnique: unique("stayup_projects_api_key_unique").on(table.apiKey),
	}
});

export const stayupTeams = pgTable("stayup_teams", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	name: text("name").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const stayupTeamMembers = pgTable("stayup_team_members", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	teamId: uuid("team_id").notNull(),
	userId: uuid("user_id").notNull(),
	role: text("role").default('member').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		stayupTeamMembersTeamIdStayupTeamsIdFk: foreignKey({
			columns: [table.teamId],
			foreignColumns: [stayupTeams.id],
			name: "stayup_team_members_team_id_stayup_teams_id_fk"
		}).onDelete("cascade"),
		stayupTeamMembersUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "stayup_team_members_user_id_users_id_fk"
		}).onDelete("cascade"),
	}
});

export const stayupIssues = pgTable("stayup_issues", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	projectId: uuid("project_id").notNull(),
	fingerprint: text("fingerprint").notNull(),
	status: text("status").default('unresolved').notNull(),
	severity: text("severity").default('error').notNull(),
	title: text("title").notNull(),
	message: text("message"),
	environment: text("environment").default('production'),
	eventCount: integer("event_count").default(0).notNull(),
	firstSeen: timestamp("first_seen", { mode: 'string' }).defaultNow().notNull(),
	lastSeen: timestamp("last_seen", { mode: 'string' }).defaultNow().notNull(),
	aiAnalyzedAt: timestamp("ai_analyzed_at", { mode: 'string' }),
	aiAnalysis: jsonb("ai_analysis"),
},
(table) => {
	return {
		stayupIssuesProjectIdStayupProjectsIdFk: foreignKey({
			columns: [table.projectId],
			foreignColumns: [stayupProjects.id],
			name: "stayup_issues_project_id_stayup_projects_id_fk"
		}).onDelete("cascade"),
	}
});

export const cronRuns = pgTable("cron_runs", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	cronName: text("cron_name").notNull(),
	runDate: text("run_date").notNull(),
	executedAt: timestamp("executed_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		cronRunsRunDateUnique: unique("cron_runs_run_date_unique").on(table.runDate),
	}
});

export const browserSessions = pgTable("browser_sessions", {
	id: text("id").primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
},
(table) => {
	return {
		browserSessionsUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "browser_sessions_user_id_users_id_fk"
		}).onDelete("cascade"),
	}
});

export const creatorProcessingLogs = pgTable("creator_processing_logs", {
	id: text("id").primaryKey().notNull(),
	streamId: text("stream_id").notNull(),
	level: text("level").default('info').notNull(),
	message: text("message").notNull(),
	meta: jsonb("meta"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		creatorProcessingLogsStreamIdCreatorStreamsIdFk: foreignKey({
			columns: [table.streamId],
			foreignColumns: [creatorStreams.id],
			name: "creator_processing_logs_stream_id_creator_streams_id_fk"
		}).onDelete("cascade"),
	}
});

export const creatorAutomationSettings = pgTable("creator_automation_settings", {
	id: text("id").primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	autoPublish: boolean("auto_publish").default(false).notNull(),
	manualApproval: boolean("manual_approval").default(true).notNull(),
	maxClipsPerStream: integer("max_clips_per_stream").default(3).notNull(),
	minClipScore: integer("min_clip_score").default(70).notNull(),
	language: text("language").default('en').notNull(),
	captionStyle: text("caption_style").default('modern_bold').notNull(),
	uploadPrivacy: text("upload_privacy").default('unlisted').notNull(),
	bannedTopics: jsonb("banned_topics").default([]),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	sourceType: text("source_type").default('own').notNull(),
	targetChannelUrl: text("target_channel_url"),
},
(table) => {
	return {
		creatorAutomationSettingsUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "creator_automation_settings_user_id_users_id_fk"
		}).onDelete("cascade"),
		creatorAutomationSettingsUserIdUnique: unique("creator_automation_settings_user_id_unique").on(table.userId),
	}
});

export const stayupHealthScans = pgTable("stayup_health_scans", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	projectId: uuid("project_id").notNull(),
	summary: text("summary").notNull(),
	status: text("status").default('healthy').notNull(),
	details: jsonb("details").default({}),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		stayupHealthScansProjectIdStayupProjectsIdFk: foreignKey({
			columns: [table.projectId],
			foreignColumns: [stayupProjects.id],
			name: "stayup_health_scans_project_id_stayup_projects_id_fk"
		}).onDelete("cascade"),
	}
});

export const stayupNotificationRules = pgTable("stayup_notification_rules", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	projectId: uuid("project_id").notNull(),
	name: text("name").notNull(),
	severityFilters: jsonb("severity_filters").default([]),
	environmentFilters: jsonb("environment_filters").default([]),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		stayupNotificationRulesProjectIdStayupProjectsIdFk: foreignKey({
			columns: [table.projectId],
			foreignColumns: [stayupProjects.id],
			name: "stayup_notification_rules_project_id_stayup_projects_id_fk"
		}).onDelete("cascade"),
	}
});

export const stayupNotifications = pgTable("stayup_notifications", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	projectId: uuid("project_id").notNull(),
	issueId: uuid("issue_id"),
	title: text("title").notNull(),
	message: text("message").notNull(),
	severity: text("severity").notNull(),
	isRead: boolean("is_read").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		stayupNotificationsIssueIdStayupIssuesIdFk: foreignKey({
			columns: [table.issueId],
			foreignColumns: [stayupIssues.id],
			name: "stayup_notifications_issue_id_stayup_issues_id_fk"
		}).onDelete("set null"),
		stayupNotificationsProjectIdStayupProjectsIdFk: foreignKey({
			columns: [table.projectId],
			foreignColumns: [stayupProjects.id],
			name: "stayup_notifications_project_id_stayup_projects_id_fk"
		}).onDelete("cascade"),
	}
});

export const chatFolders = pgTable("chat_folders", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	name: text("name").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		chatFoldersUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "chat_folders_user_id_users_id_fk"
		}).onDelete("cascade"),
	}
});

export const templates = pgTable("templates", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	name: text("name").notNull(),
	shortDescription: text("short_description").notNull(),
	description: text("description"),
	mainImage: text("main_image"),
	images: jsonb("images").default([]),
	url: text("url"),
	chatId: text("chat_id"),
	categories: jsonb("categories").default([]),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		templatesUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "templates_user_id_users_id_fk"
		}).onDelete("cascade"),
	}
});

export const creatorStreams = pgTable("creator_streams", {
	id: text("id").primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	platform: text("platform").notNull(),
	externalStreamId: text("external_stream_id").notNull(),
	title: text("title"),
	status: text("status").default('detected_live').notNull(),
	vodUrl: text("vod_url"),
	durationSeconds: integer("duration_seconds"),
	startedAt: timestamp("started_at", { mode: 'string' }),
	endedAt: timestamp("ended_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		creatorStreamsUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "creator_streams_user_id_users_id_fk"
		}).onDelete("cascade"),
	}
});

export const creatorClips = pgTable("creator_clips", {
	id: text("id").primaryKey().notNull(),
	streamId: text("stream_id").notNull(),
	userId: uuid("user_id").notNull(),
	title: text("title").notNull(),
	hookText: text("hook_text"),
	description: text("description"),
	hashtags: jsonb("hashtags").default([]),
	startTime: integer("start_time").notNull(),
	endTime: integer("end_time").notNull(),
	score: integer("score").notNull(),
	contentType: text("content_type").notNull(),
	videoUrl: text("video_url"),
	thumbnailUrl: text("thumbnail_url"),
	status: text("status").default('generated').notNull(),
	riskFlags: jsonb("risk_flags").default([]),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		creatorClipsStreamIdCreatorStreamsIdFk: foreignKey({
			columns: [table.streamId],
			foreignColumns: [creatorStreams.id],
			name: "creator_clips_stream_id_creator_streams_id_fk"
		}).onDelete("cascade"),
		creatorClipsUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "creator_clips_user_id_users_id_fk"
		}).onDelete("cascade"),
	}
});

export const elementComments = pgTable("element_comments", {
	id: text("id").primaryKey().notNull(),
	chatId: text("chat_id"),
	elementInfo: jsonb("element_info").notNull(),
	position: jsonb("position").notNull(),
	messages: jsonb("messages").default([]).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const chats = pgTable("chats", {
	id: text("id").primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	title: text("title").default('New Chat'),
	description: text("description"),
	model: text("model"),
	provider: text("provider"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	isPublic: boolean("is_public").default(false).notNull(),
	folderId: uuid("folder_id"),
},
(table) => {
	return {
		chatsFolderIdChatFoldersIdFk: foreignKey({
			columns: [table.folderId],
			foreignColumns: [chatFolders.id],
			name: "chats_folder_id_chat_folders_id_fk"
		}).onDelete("set null"),
		chatsUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "chats_user_id_users_id_fk"
		}).onDelete("cascade"),
	}
});

export const veSubAccounts = pgTable("ve_sub_accounts", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	connectAccountId: text("connect_account_id").default(''),
	paypalClientId: text("paypal_client_id").default(''),
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
	agencyId: uuid("agency_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		veSubAccountsAgencyIdVeAgenciesIdFk: foreignKey({
			columns: [table.agencyId],
			foreignColumns: [veAgencies.id],
			name: "ve_sub_accounts_agency_id_ve_agencies_id_fk"
		}).onDelete("cascade"),
	}
});

export const vePipelines = pgTable("ve_pipelines", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	name: text("name").notNull(),
	subAccountId: uuid("sub_account_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		vePipelinesSubAccountIdVeSubAccountsIdFk: foreignKey({
			columns: [table.subAccountId],
			foreignColumns: [veSubAccounts.id],
			name: "ve_pipelines_sub_account_id_ve_sub_accounts_id_fk"
		}).onDelete("cascade"),
	}
});

export const neonDatabases = pgTable("neon_databases", {
	chatId: text("chat_id").primaryKey().notNull(),
	databaseUrl: text("database_url").notNull(),
	projectId: text("project_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const supabaseDatabases = pgTable("supabase_databases", {
	chatId: text("chat_id").primaryKey().notNull(),
	supabaseUrl: text("supabase_url").notNull(),
	supabaseAnonKey: text("supabase_anon_key").notNull(),
	projectId: text("project_id").notNull(),
	databasePassword: text("database_password").notNull(),
	databaseUrl: text("database_url"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const veLanes = pgTable("ve_lanes", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	name: text("name").notNull(),
	pipelineId: uuid("pipeline_id").notNull(),
	order: integer("order").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		veLanesPipelineIdVePipelinesIdFk: foreignKey({
			columns: [table.pipelineId],
			foreignColumns: [vePipelines.id],
			name: "ve_lanes_pipeline_id_ve_pipelines_id_fk"
		}).onDelete("cascade"),
	}
});

export const vePermissions = pgTable("ve_permissions", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	email: text("email").notNull(),
	subAccountId: uuid("sub_account_id").notNull(),
	access: boolean("access").notNull(),
},
(table) => {
	return {
		vePermissionsSubAccountIdVeSubAccountsIdFk: foreignKey({
			columns: [table.subAccountId],
			foreignColumns: [veSubAccounts.id],
			name: "ve_permissions_sub_account_id_ve_sub_accounts_id_fk"
		}).onDelete("cascade"),
	}
});

export const veAgencies = pgTable("ve_agencies", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	connectAccountId: text("connect_account_id").default(''),
	customerId: text("customer_id").default(''),
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
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const veFunnels = pgTable("ve_funnels", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	name: text("name").notNull(),
	description: text("description"),
	published: boolean("published").default(false).notNull(),
	subDomainName: text("sub_domain_name"),
	favicon: text("favicon"),
	liveProducts: text("live_products").default('[]'),
	subAccountId: uuid("sub_account_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		veFunnelsSubAccountIdVeSubAccountsIdFk: foreignKey({
			columns: [table.subAccountId],
			foreignColumns: [veSubAccounts.id],
			name: "ve_funnels_sub_account_id_ve_sub_accounts_id_fk"
		}).onDelete("cascade"),
		veFunnelsSubDomainNameUnique: unique("ve_funnels_sub_domain_name_unique").on(table.subDomainName),
	}
});

export const veAutomations = pgTable("ve_automations", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	name: text("name").notNull(),
	triggerId: uuid("trigger_id"),
	published: boolean("published").default(false).notNull(),
	subAccountId: uuid("sub_account_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		veAutomationsSubAccountIdVeSubAccountsIdFk: foreignKey({
			columns: [table.subAccountId],
			foreignColumns: [veSubAccounts.id],
			name: "ve_automations_sub_account_id_ve_sub_accounts_id_fk"
		}).onDelete("cascade"),
		veAutomationsTriggerIdVeTriggersIdFk: foreignKey({
			columns: [table.triggerId],
			foreignColumns: [veTriggers.id],
			name: "ve_automations_trigger_id_ve_triggers_id_fk"
		}).onDelete("cascade"),
	}
});

export const projects = pgTable("projects", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	chatId: text("chat_id"),
	title: text("title").notNull(),
	description: text("description"),
	deploymentConfig: jsonb("deployment_config").default({}),
	repoInfo: jsonb("repo_info").default({}),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		projectsChatIdChatsIdFk: foreignKey({
			columns: [table.chatId],
			foreignColumns: [chats.id],
			name: "projects_chat_id_chats_id_fk"
		}).onDelete("set null"),
		projectsUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "projects_user_id_users_id_fk"
		}).onDelete("cascade"),
	}
});

export const veTags = pgTable("ve_tags", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	name: text("name").notNull(),
	color: text("color").notNull(),
	subAccountId: uuid("sub_account_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		veTagsSubAccountIdVeSubAccountsIdFk: foreignKey({
			columns: [table.subAccountId],
			foreignColumns: [veSubAccounts.id],
			name: "ve_tags_sub_account_id_ve_sub_accounts_id_fk"
		}).onDelete("cascade"),
	}
});

export const veTriggers = pgTable("ve_triggers", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	name: text("name").notNull(),
	type: text("type").notNull(),
	subAccountId: uuid("sub_account_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		veTriggersSubAccountIdVeSubAccountsIdFk: foreignKey({
			columns: [table.subAccountId],
			foreignColumns: [veSubAccounts.id],
			name: "ve_triggers_sub_account_id_ve_sub_accounts_id_fk"
		}).onDelete("cascade"),
	}
});

export const veFunnelPages = pgTable("ve_funnel_pages", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	name: text("name").notNull(),
	pathName: text("path_name").default('').notNull(),
	visits: integer("visits").default(0).notNull(),
	content: text("content"),
	order: integer("order").notNull(),
	previewImage: text("preview_image"),
	funnelId: uuid("funnel_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		veFunnelPagesFunnelIdVeFunnelsIdFk: foreignKey({
			columns: [table.funnelId],
			foreignColumns: [veFunnels.id],
			name: "ve_funnel_pages_funnel_id_ve_funnels_id_fk"
		}).onDelete("cascade"),
	}
});

export const veTickets = pgTable("ve_tickets", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	name: text("name").notNull(),
	laneId: uuid("lane_id").notNull(),
	order: integer("order").default(0).notNull(),
	value: numeric("value"),
	description: text("description"),
	customerId: uuid("customer_id"),
	assignedUserId: uuid("assigned_user_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		veTicketsAssignedUserIdUsersIdFk: foreignKey({
			columns: [table.assignedUserId],
			foreignColumns: [users.id],
			name: "ve_tickets_assigned_user_id_users_id_fk"
		}).onDelete("set null"),
		veTicketsLaneIdVeLanesIdFk: foreignKey({
			columns: [table.laneId],
			foreignColumns: [veLanes.id],
			name: "ve_tickets_lane_id_ve_lanes_id_fk"
		}).onDelete("cascade"),
	}
});

export const creatorConnectedAccounts = pgTable("creator_connected_accounts", {
	id: text("id").primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	platform: text("platform").notNull(),
	platformUserId: text("platform_user_id").notNull(),
	platformUsername: text("platform_username").notNull(),
	accessTokenEncrypted: text("access_token_encrypted").notNull(),
	refreshTokenEncrypted: text("refresh_token_encrypted"),
	tokenExpiresAt: timestamp("token_expires_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		creatorConnectedAccountsUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "creator_connected_accounts_user_id_users_id_fk"
		}).onDelete("cascade"),
	}
});

export const eventLogs = pgTable("event_logs", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	type: text("type").notNull(),
	category: text("category"),
	message: text("message").notNull(),
	details: jsonb("details").default({}),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		eventLogsUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "event_logs_user_id_users_id_fk"
		}).onDelete("cascade"),
	}
});

export const gitCredentials = pgTable("git_credentials", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	domain: text("domain").notNull(),
	username: text("username"),
	token: text("token"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		gitCredentialsUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "git_credentials_user_id_users_id_fk"
		}).onDelete("cascade"),
	}
});

export const mcpSettings = pgTable("mcp_settings", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	config: jsonb("config").default({}),
	maxLlmSteps: integer("max_llm_steps").default(15),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		mcpSettingsUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "mcp_settings_user_id_users_id_fk"
		}).onDelete("cascade"),
	}
});

export const providerSettings = pgTable("provider_settings", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	providerName: text("provider_name").notNull(),
	settings: jsonb("settings").default({}),
	enabled: boolean("enabled").default(false),
	apiKey: text("api_key"),
	baseUrl: text("base_url"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		providerSettingsUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "provider_settings_user_id_users_id_fk"
		}).onDelete("cascade"),
	}
});

export const serviceConnections = pgTable("service_connections", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	service: text("service").notNull(),
	token: text("token"),
	tokenType: text("token_type"),
	username: text("username"),
	stats: jsonb("stats").default({}),
	settings: jsonb("settings").default({}),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		serviceConnectionsUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "service_connections_user_id_users_id_fk"
		}).onDelete("cascade"),
	}
});

export const sessions = pgTable("sessions", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	token: text("token").notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		sessionsUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "sessions_user_id_users_id_fk"
		}).onDelete("cascade"),
		sessionsTokenUnique: unique("sessions_token_unique").on(table.token),
	}
});

export const tabConfigurations = pgTable("tab_configurations", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	config: jsonb("config").default({}),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		tabConfigurationsUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "tab_configurations_user_id_users_id_fk"
		}).onDelete("cascade"),
	}
});

export const userPreferences = pgTable("user_preferences", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	key: text("key").notNull(),
	value: jsonb("value").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		userPreferencesUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_preferences_user_id_users_id_fk"
		}).onDelete("cascade"),
	}
});

export const memories = pgTable("memories", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	content: text("content").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		memoriesUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "memories_user_id_users_id_fk"
		}).onDelete("cascade"),
	}
});

export const payments = pgTable("payments", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	orderId: text("order_id").notNull(),
	amount: integer("amount").notNull(),
	tier: text("tier"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		paymentsUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "payments_user_id_users_id_fk"
		}).onDelete("cascade"),
	}
});

export const skills = pgTable("skills", {
	id: text("id").primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	name: text("name").notNull(),
	description: text("description"),
	content: text("content").notNull(),
	isActive: boolean("is_active").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		skillsUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "skills_user_id_users_id_fk"
		}).onDelete("cascade"),
	}
});

export const generatedImages = pgTable("generated_images", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	prompt: text("prompt").notNull(),
	imageUrl: text("image_url").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		generatedImagesUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "generated_images_user_id_users_id_fk"
		}).onDelete("cascade"),
	}
});

export const hackingChatSnapshots = pgTable("hacking_chat_snapshots", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	chatId: text("chat_id").notNull(),
	userId: uuid("user_id").notNull(),
	files: jsonb("files").default({}),
	summary: text("summary"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		hackingChatSnapshotsChatIdHackingChatsIdFk: foreignKey({
			columns: [table.chatId],
			foreignColumns: [hackingChats.id],
			name: "hacking_chat_snapshots_chat_id_hacking_chats_id_fk"
		}).onDelete("cascade"),
		hackingChatSnapshotsUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "hacking_chat_snapshots_user_id_users_id_fk"
		}).onDelete("cascade"),
	}
});

export const hackingChats = pgTable("hacking_chats", {
	id: text("id").primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	title: text("title").default('New Hacking Chat'),
	description: text("description"),
	model: text("model"),
	provider: text("provider"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		hackingChatsUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "hacking_chats_user_id_users_id_fk"
		}).onDelete("cascade"),
	}
});

export const feedbacks = pgTable("feedbacks", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	content: jsonb("content").notNull(),
	rating: integer("rating").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		feedbacksUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "feedbacks_user_id_users_id_fk"
		}).onDelete("cascade"),
	}
});

export const follows = pgTable("follows", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	followerId: uuid("follower_id").notNull(),
	followingId: uuid("following_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		followsFollowerIdUsersIdFk: foreignKey({
			columns: [table.followerId],
			foreignColumns: [users.id],
			name: "follows_follower_id_users_id_fk"
		}).onDelete("cascade"),
		followsFollowingIdUsersIdFk: foreignKey({
			columns: [table.followingId],
			foreignColumns: [users.id],
			name: "follows_following_id_users_id_fk"
		}).onDelete("cascade"),
	}
});

export const hackingMessages = pgTable("hacking_messages", {
	id: text("id").primaryKey().notNull(),
	chatId: text("chat_id").notNull(),
	role: text("role").notNull(),
	content: text("content"),
	parts: jsonb("parts").default([]),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		hackingMessagesChatIdHackingChatsIdFk: foreignKey({
			columns: [table.chatId],
			foreignColumns: [hackingChats.id],
			name: "hacking_messages_chat_id_hacking_chats_id_fk"
		}).onDelete("cascade"),
	}
});

export const veFunnelsProduct = pgTable("ve_funnels_product", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	name: text("name").notNull(),
	price: text("price").notNull(),
	priceId: text("price_id").notNull(),
	subAccountId: uuid("sub_account_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		veFunnelsProductSubAccountIdVeSubAccountsIdFk: foreignKey({
			columns: [table.subAccountId],
			foreignColumns: [veSubAccounts.id],
			name: "ve_funnels_product_sub_account_id_ve_sub_accounts_id_fk"
		}).onDelete("cascade"),
	}
});

export const veContacts = pgTable("ve_contacts", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	name: text("name").notNull(),
	email: text("email").notNull(),
	subAccountId: uuid("sub_account_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		veContactsSubAccountIdVeSubAccountsIdFk: foreignKey({
			columns: [table.subAccountId],
			foreignColumns: [veSubAccounts.id],
			name: "ve_contacts_sub_account_id_ve_sub_accounts_id_fk"
		}).onDelete("cascade"),
	}
});

export const prReports = pgTable("pr_reports", {
	id: uuid("id").primaryKey().notNull(),
	repositoryId: uuid("repository_id"),
	prNumber: text("pr_number"),
	title: text("title"),
	riskLevel: text("risk_level"),
	summary: text("summary"),
	markdownReport: text("markdown_report"),
	createdAt: timestamp("created_at", { mode: 'string' }),
});

export const veActions = pgTable("ve_actions", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	name: text("name").notNull(),
	type: text("type").notNull(),
	automationId: uuid("automation_id").notNull(),
	order: integer("order").notNull(),
	laneId: text("lane_id").default('0').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		veActionsAutomationIdVeAutomationsIdFk: foreignKey({
			columns: [table.automationId],
			foreignColumns: [veAutomations.id],
			name: "ve_actions_automation_id_ve_automations_id_fk"
		}).onDelete("cascade"),
	}
});

export const globalSettings = pgTable("global_settings", {
	id: serial("id").primaryKey().notNull(),
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
	id: uuid("id").primaryKey().notNull(),
	name: text("name"),
	fullName: text("full_name"),
	githubId: text("github_id"),
	connectedAt: timestamp("connected_at", { mode: 'string' }),
});

export const adrRules = pgTable("adr_rules", {
	id: uuid("id").primaryKey().notNull(),
	repositoryId: uuid("repository_id"),
	title: text("title"),
	description: text("description"),
	severity: text("severity"),
	createdAt: timestamp("created_at", { mode: 'string' }),
});

export const files = pgTable("files", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	chatId: text("chat_id"),
	path: text("path"),
	content: text("content"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const deployments = pgTable("deployments", {
	chatId: text("chat_id").primaryKey().notNull(),
	url: text("url").notNull(),
	provider: text("provider").notNull(),
	subdomain: text("subdomain"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	seoTitle: text("seo_title"),
	seoDescription: text("seo_description"),
	seoImage: text("seo_image"),
},
(table) => {
	return {
		deploymentsChatIdChatsIdFk: foreignKey({
			columns: [table.chatId],
			foreignColumns: [chats.id],
			name: "deployments_chat_id_chats_id_fk"
		}).onDelete("cascade"),
	}
});
export const products = pgTable("products", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	name: text("name").notNull(),
	description: text("description"),
	isActive: boolean("is_active").default(true).notNull(),
	lastActiveAt: timestamp("last_active_at", { mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		productsUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "products_user_id_users_id_fk"
		}).onDelete("cascade"),
	}
});

export const competitors = pgTable("competitors", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	productId: uuid("product_id").notNull(),
	name: text("name").notNull(),
	websiteUrl: text("website_url"),
	strengths: text("strengths"),
	weaknesses: text("weaknesses"),
	featureDifferences: text("feature_differences"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		competitorsProductIdProductsIdFk: foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "competitors_product_id_products_id_fk"
		}).onDelete("cascade"),
	}
});

export const productIdeas = pgTable("product_ideas", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	productId: uuid("product_id").notNull(),
	title: text("title").notNull(),
	description: text("description"),
	reasoning: text("reasoning"),
	status: text("status").default('new').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		productIdeasProductIdProductsIdFk: foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "product_ideas_product_id_products_id_fk"
		}).onDelete("cascade"),
	}
});

export const productUpdates = pgTable("product_updates", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	productId: uuid("product_id").notNull(),
	type: text("type").notNull(),
	content: jsonb("content").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		productUpdatesProductIdProductsIdFk: foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "product_updates_product_id_products_id_fk"
		}).onDelete("cascade"),
	}
});
