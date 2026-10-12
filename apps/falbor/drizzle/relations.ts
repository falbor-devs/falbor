import { relations } from "drizzle-orm/relations";
import { chats, analyzedReports, users, chatImages, workflowExecutions, workflowExecutionLogs, workflows, workflowVersions, mcpConnections, workflowJobs, analyzedFeedbacks, messages, chatSnapshots, sourcesInvestigations, stayupIssues, stayupEvents, stayupProjects, templates, templateReviews, stayupTeams, stayupTeamMembers, browserSessions, creatorStreams, creatorProcessingLogs, creatorAutomationSettings, stayupHealthScans, stayupNotificationRules, stayupNotifications, chatFolders, creatorClips, veAgencies, veSubAccounts, vePipelines, veLanes, vePermissions, veFunnels, veAutomations, veTriggers, projects, veTags, veFunnelPages, veTickets, creatorConnectedAccounts, eventLogs, gitCredentials, mcpSettings, providerSettings, serviceConnections, sessions, tabConfigurations, userPreferences, memories, payments, skills, generatedImages, hackingChats, hackingChatSnapshots, feedbacks, follows, hackingMessages, veFunnelsProduct, veContacts, veActions, deployments, products, competitors, productIdeas, productUpdates } from "./schema";

export const analyzedReportsRelations = relations(analyzedReports, ({one, many}) => ({
	chat: one(chats, {
		fields: [analyzedReports.chatId],
		references: [chats.id]
	}),
	user: one(users, {
		fields: [analyzedReports.userId],
		references: [users.id]
	}),
	analyzedFeedbacks: many(analyzedFeedbacks),
}));

export const chatsRelations = relations(chats, ({one, many}) => ({
	analyzedReports: many(analyzedReports),
	chatImages: many(chatImages),
	workflows: many(workflows),
	messages: many(messages),
	chatSnapshots: many(chatSnapshots),
	chatFolder: one(chatFolders, {
		fields: [chats.folderId],
		references: [chatFolders.id]
	}),
	user: one(users, {
		fields: [chats.userId],
		references: [users.id]
	}),
	projects: many(projects),
	deployments: many(deployments),
}));

export const usersRelations = relations(users, ({many}) => ({
	analyzedReports: many(analyzedReports),
	workflows: many(workflows),
	mcpConnections: many(mcpConnections),
	chatSnapshots: many(chatSnapshots),
	sourcesInvestigations: many(sourcesInvestigations),
	templateReviews: many(templateReviews),
	stayupProjects: many(stayupProjects),
	stayupTeamMembers: many(stayupTeamMembers),
	browserSessions: many(browserSessions),
	creatorAutomationSettings: many(creatorAutomationSettings),
	chatFolders: many(chatFolders),
	templates: many(templates),
	creatorStreams: many(creatorStreams),
	creatorClips: many(creatorClips),
	chats: many(chats),
	projects: many(projects),
	veTickets: many(veTickets),
	creatorConnectedAccounts: many(creatorConnectedAccounts),
	eventLogs: many(eventLogs),
	gitCredentials: many(gitCredentials),
	mcpSettings: many(mcpSettings),
	providerSettings: many(providerSettings),
	serviceConnections: many(serviceConnections),
	sessions: many(sessions),
	tabConfigurations: many(tabConfigurations),
	userPreferences: many(userPreferences),
	memories: many(memories),
	payments: many(payments),
	skills: many(skills),
	generatedImages: many(generatedImages),
	hackingChatSnapshots: many(hackingChatSnapshots),
	hackingChats: many(hackingChats),
	feedbacks: many(feedbacks),
	follows_followerId: many(follows, {
		relationName: "follows_followerId_users_id"
	}),
	follows_followingId: many(follows, {
		relationName: "follows_followingId_users_id"
	}),
}));

export const chatImagesRelations = relations(chatImages, ({one}) => ({
	chat: one(chats, {
		fields: [chatImages.chatId],
		references: [chats.id]
	}),
}));

export const workflowExecutionLogsRelations = relations(workflowExecutionLogs, ({one}) => ({
	workflowExecution: one(workflowExecutions, {
		fields: [workflowExecutionLogs.executionId],
		references: [workflowExecutions.id]
	}),
}));

export const workflowExecutionsRelations = relations(workflowExecutions, ({one, many}) => ({
	workflowExecutionLogs: many(workflowExecutionLogs),
	workflowVersion: one(workflowVersions, {
		fields: [workflowExecutions.versionId],
		references: [workflowVersions.id]
	}),
	workflow: one(workflows, {
		fields: [workflowExecutions.workflowId],
		references: [workflows.id]
	}),
	workflowJobs: many(workflowJobs),
}));

export const workflowVersionsRelations = relations(workflowVersions, ({one, many}) => ({
	workflow: one(workflows, {
		fields: [workflowVersions.workflowId],
		references: [workflows.id]
	}),
	workflowExecutions: many(workflowExecutions),
}));

export const workflowsRelations = relations(workflows, ({one, many}) => ({
	workflowVersions: many(workflowVersions),
	workflowExecutions: many(workflowExecutions),
	chat: one(chats, {
		fields: [workflows.chatId],
		references: [chats.id]
	}),
	user: one(users, {
		fields: [workflows.userId],
		references: [users.id]
	}),
	workflowJobs: many(workflowJobs),
}));

export const mcpConnectionsRelations = relations(mcpConnections, ({one}) => ({
	user: one(users, {
		fields: [mcpConnections.userId],
		references: [users.id]
	}),
}));

export const workflowJobsRelations = relations(workflowJobs, ({one}) => ({
	workflowExecution: one(workflowExecutions, {
		fields: [workflowJobs.executionId],
		references: [workflowExecutions.id]
	}),
	workflow: one(workflows, {
		fields: [workflowJobs.workflowId],
		references: [workflows.id]
	}),
}));

export const analyzedFeedbacksRelations = relations(analyzedFeedbacks, ({one}) => ({
	analyzedReport: one(analyzedReports, {
		fields: [analyzedFeedbacks.reportId],
		references: [analyzedReports.id]
	}),
}));

export const messagesRelations = relations(messages, ({one}) => ({
	chat: one(chats, {
		fields: [messages.chatId],
		references: [chats.id]
	}),
}));

export const chatSnapshotsRelations = relations(chatSnapshots, ({one}) => ({
	chat: one(chats, {
		fields: [chatSnapshots.chatId],
		references: [chats.id]
	}),
	user: one(users, {
		fields: [chatSnapshots.userId],
		references: [users.id]
	}),
}));

export const sourcesInvestigationsRelations = relations(sourcesInvestigations, ({one}) => ({
	user: one(users, {
		fields: [sourcesInvestigations.userId],
		references: [users.id]
	}),
}));

export const stayupEventsRelations = relations(stayupEvents, ({one}) => ({
	stayupIssue: one(stayupIssues, {
		fields: [stayupEvents.issueId],
		references: [stayupIssues.id]
	}),
	stayupProject: one(stayupProjects, {
		fields: [stayupEvents.projectId],
		references: [stayupProjects.id]
	}),
}));

export const stayupIssuesRelations = relations(stayupIssues, ({one, many}) => ({
	stayupEvents: many(stayupEvents),
	stayupProject: one(stayupProjects, {
		fields: [stayupIssues.projectId],
		references: [stayupProjects.id]
	}),
	stayupNotifications: many(stayupNotifications),
}));

export const stayupProjectsRelations = relations(stayupProjects, ({one, many}) => ({
	stayupEvents: many(stayupEvents),
	user: one(users, {
		fields: [stayupProjects.userId],
		references: [users.id]
	}),
	stayupIssues: many(stayupIssues),
	stayupHealthScans: many(stayupHealthScans),
	stayupNotificationRules: many(stayupNotificationRules),
	stayupNotifications: many(stayupNotifications),
}));

export const templateReviewsRelations = relations(templateReviews, ({one}) => ({
	template: one(templates, {
		fields: [templateReviews.templateId],
		references: [templates.id]
	}),
	user: one(users, {
		fields: [templateReviews.userId],
		references: [users.id]
	}),
}));

export const templatesRelations = relations(templates, ({one, many}) => ({
	templateReviews: many(templateReviews),
	user: one(users, {
		fields: [templates.userId],
		references: [users.id]
	}),
}));

export const stayupTeamMembersRelations = relations(stayupTeamMembers, ({one}) => ({
	stayupTeam: one(stayupTeams, {
		fields: [stayupTeamMembers.teamId],
		references: [stayupTeams.id]
	}),
	user: one(users, {
		fields: [stayupTeamMembers.userId],
		references: [users.id]
	}),
}));

export const stayupTeamsRelations = relations(stayupTeams, ({many}) => ({
	stayupTeamMembers: many(stayupTeamMembers),
}));

export const browserSessionsRelations = relations(browserSessions, ({one}) => ({
	user: one(users, {
		fields: [browserSessions.userId],
		references: [users.id]
	}),
}));

export const creatorProcessingLogsRelations = relations(creatorProcessingLogs, ({one}) => ({
	creatorStream: one(creatorStreams, {
		fields: [creatorProcessingLogs.streamId],
		references: [creatorStreams.id]
	}),
}));

export const creatorStreamsRelations = relations(creatorStreams, ({one, many}) => ({
	creatorProcessingLogs: many(creatorProcessingLogs),
	user: one(users, {
		fields: [creatorStreams.userId],
		references: [users.id]
	}),
	creatorClips: many(creatorClips),
}));

export const creatorAutomationSettingsRelations = relations(creatorAutomationSettings, ({one}) => ({
	user: one(users, {
		fields: [creatorAutomationSettings.userId],
		references: [users.id]
	}),
}));

export const stayupHealthScansRelations = relations(stayupHealthScans, ({one}) => ({
	stayupProject: one(stayupProjects, {
		fields: [stayupHealthScans.projectId],
		references: [stayupProjects.id]
	}),
}));

export const stayupNotificationRulesRelations = relations(stayupNotificationRules, ({one}) => ({
	stayupProject: one(stayupProjects, {
		fields: [stayupNotificationRules.projectId],
		references: [stayupProjects.id]
	}),
}));

export const stayupNotificationsRelations = relations(stayupNotifications, ({one}) => ({
	stayupIssue: one(stayupIssues, {
		fields: [stayupNotifications.issueId],
		references: [stayupIssues.id]
	}),
	stayupProject: one(stayupProjects, {
		fields: [stayupNotifications.projectId],
		references: [stayupProjects.id]
	}),
}));

export const chatFoldersRelations = relations(chatFolders, ({one, many}) => ({
	user: one(users, {
		fields: [chatFolders.userId],
		references: [users.id]
	}),
	chats: many(chats),
}));

export const creatorClipsRelations = relations(creatorClips, ({one}) => ({
	creatorStream: one(creatorStreams, {
		fields: [creatorClips.streamId],
		references: [creatorStreams.id]
	}),
	user: one(users, {
		fields: [creatorClips.userId],
		references: [users.id]
	}),
}));

export const veSubAccountsRelations = relations(veSubAccounts, ({one, many}) => ({
	veAgency: one(veAgencies, {
		fields: [veSubAccounts.agencyId],
		references: [veAgencies.id]
	}),
	vePipelines: many(vePipelines),
	vePermissions: many(vePermissions),
	veFunnels: many(veFunnels),
	veAutomations: many(veAutomations),
	veTags: many(veTags),
	veTriggers: many(veTriggers),
	veFunnelsProducts: many(veFunnelsProduct),
	veContacts: many(veContacts),
}));

export const veAgenciesRelations = relations(veAgencies, ({many}) => ({
	veSubAccounts: many(veSubAccounts),
}));

export const vePipelinesRelations = relations(vePipelines, ({one, many}) => ({
	veSubAccount: one(veSubAccounts, {
		fields: [vePipelines.subAccountId],
		references: [veSubAccounts.id]
	}),
	veLanes: many(veLanes),
}));

export const veLanesRelations = relations(veLanes, ({one, many}) => ({
	vePipeline: one(vePipelines, {
		fields: [veLanes.pipelineId],
		references: [vePipelines.id]
	}),
	veTickets: many(veTickets),
}));

export const vePermissionsRelations = relations(vePermissions, ({one}) => ({
	veSubAccount: one(veSubAccounts, {
		fields: [vePermissions.subAccountId],
		references: [veSubAccounts.id]
	}),
}));

export const veFunnelsRelations = relations(veFunnels, ({one, many}) => ({
	veSubAccount: one(veSubAccounts, {
		fields: [veFunnels.subAccountId],
		references: [veSubAccounts.id]
	}),
	veFunnelPages: many(veFunnelPages),
}));

export const veAutomationsRelations = relations(veAutomations, ({one, many}) => ({
	veSubAccount: one(veSubAccounts, {
		fields: [veAutomations.subAccountId],
		references: [veSubAccounts.id]
	}),
	veTrigger: one(veTriggers, {
		fields: [veAutomations.triggerId],
		references: [veTriggers.id]
	}),
	veActions: many(veActions),
}));

export const veTriggersRelations = relations(veTriggers, ({one, many}) => ({
	veAutomations: many(veAutomations),
	veSubAccount: one(veSubAccounts, {
		fields: [veTriggers.subAccountId],
		references: [veSubAccounts.id]
	}),
}));

export const projectsRelations = relations(projects, ({one}) => ({
	chat: one(chats, {
		fields: [projects.chatId],
		references: [chats.id]
	}),
	user: one(users, {
		fields: [projects.userId],
		references: [users.id]
	}),
}));

export const veTagsRelations = relations(veTags, ({one}) => ({
	veSubAccount: one(veSubAccounts, {
		fields: [veTags.subAccountId],
		references: [veSubAccounts.id]
	}),
}));

export const veFunnelPagesRelations = relations(veFunnelPages, ({one}) => ({
	veFunnel: one(veFunnels, {
		fields: [veFunnelPages.funnelId],
		references: [veFunnels.id]
	}),
}));

export const veTicketsRelations = relations(veTickets, ({one}) => ({
	user: one(users, {
		fields: [veTickets.assignedUserId],
		references: [users.id]
	}),
	veLane: one(veLanes, {
		fields: [veTickets.laneId],
		references: [veLanes.id]
	}),
}));

export const creatorConnectedAccountsRelations = relations(creatorConnectedAccounts, ({one}) => ({
	user: one(users, {
		fields: [creatorConnectedAccounts.userId],
		references: [users.id]
	}),
}));

export const eventLogsRelations = relations(eventLogs, ({one}) => ({
	user: one(users, {
		fields: [eventLogs.userId],
		references: [users.id]
	}),
}));

export const gitCredentialsRelations = relations(gitCredentials, ({one}) => ({
	user: one(users, {
		fields: [gitCredentials.userId],
		references: [users.id]
	}),
}));

export const mcpSettingsRelations = relations(mcpSettings, ({one}) => ({
	user: one(users, {
		fields: [mcpSettings.userId],
		references: [users.id]
	}),
}));

export const providerSettingsRelations = relations(providerSettings, ({one}) => ({
	user: one(users, {
		fields: [providerSettings.userId],
		references: [users.id]
	}),
}));

export const serviceConnectionsRelations = relations(serviceConnections, ({one}) => ({
	user: one(users, {
		fields: [serviceConnections.userId],
		references: [users.id]
	}),
}));

export const sessionsRelations = relations(sessions, ({one}) => ({
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id]
	}),
}));

export const tabConfigurationsRelations = relations(tabConfigurations, ({one}) => ({
	user: one(users, {
		fields: [tabConfigurations.userId],
		references: [users.id]
	}),
}));

export const userPreferencesRelations = relations(userPreferences, ({one}) => ({
	user: one(users, {
		fields: [userPreferences.userId],
		references: [users.id]
	}),
}));

export const memoriesRelations = relations(memories, ({one}) => ({
	user: one(users, {
		fields: [memories.userId],
		references: [users.id]
	}),
}));

export const paymentsRelations = relations(payments, ({one}) => ({
	user: one(users, {
		fields: [payments.userId],
		references: [users.id]
	}),
}));

export const skillsRelations = relations(skills, ({one}) => ({
	user: one(users, {
		fields: [skills.userId],
		references: [users.id]
	}),
}));

export const generatedImagesRelations = relations(generatedImages, ({one}) => ({
	user: one(users, {
		fields: [generatedImages.userId],
		references: [users.id]
	}),
}));

export const hackingChatSnapshotsRelations = relations(hackingChatSnapshots, ({one}) => ({
	hackingChat: one(hackingChats, {
		fields: [hackingChatSnapshots.chatId],
		references: [hackingChats.id]
	}),
	user: one(users, {
		fields: [hackingChatSnapshots.userId],
		references: [users.id]
	}),
}));

export const hackingChatsRelations = relations(hackingChats, ({one, many}) => ({
	hackingChatSnapshots: many(hackingChatSnapshots),
	user: one(users, {
		fields: [hackingChats.userId],
		references: [users.id]
	}),
	hackingMessages: many(hackingMessages),
}));

export const feedbacksRelations = relations(feedbacks, ({one}) => ({
	user: one(users, {
		fields: [feedbacks.userId],
		references: [users.id]
	}),
}));

export const followsRelations = relations(follows, ({one}) => ({
	user_followerId: one(users, {
		fields: [follows.followerId],
		references: [users.id],
		relationName: "follows_followerId_users_id"
	}),
	user_followingId: one(users, {
		fields: [follows.followingId],
		references: [users.id],
		relationName: "follows_followingId_users_id"
	}),
}));

export const hackingMessagesRelations = relations(hackingMessages, ({one}) => ({
	hackingChat: one(hackingChats, {
		fields: [hackingMessages.chatId],
		references: [hackingChats.id]
	}),
}));

export const veFunnelsProductRelations = relations(veFunnelsProduct, ({one}) => ({
	veSubAccount: one(veSubAccounts, {
		fields: [veFunnelsProduct.subAccountId],
		references: [veSubAccounts.id]
	}),
}));

export const veContactsRelations = relations(veContacts, ({one}) => ({
	veSubAccount: one(veSubAccounts, {
		fields: [veContacts.subAccountId],
		references: [veSubAccounts.id]
	}),
}));

export const veActionsRelations = relations(veActions, ({one}) => ({
	veAutomation: one(veAutomations, {
		fields: [veActions.automationId],
		references: [veAutomations.id]
	}),
}));

export const deploymentsRelations = relations(deployments, ({one}) => ({
	chat: one(chats, {
		fields: [deployments.chatId],
		references: [chats.id]
	}),
}));
export const productsRelations = relations(products, ({one, many}) => ({
	user: one(users, {
		fields: [products.userId],
		references: [users.id]
	}),
	competitors: many(competitors),
	productIdeas: many(productIdeas),
	productUpdates: many(productUpdates),
}));

export const competitorsRelations = relations(competitors, ({one}) => ({
	product: one(products, {
		fields: [competitors.productId],
		references: [products.id]
	}),
}));

export const productIdeasRelations = relations(productIdeas, ({one}) => ({
	product: one(products, {
		fields: [productIdeas.productId],
		references: [products.id]
	}),
}));

export const productUpdatesRelations = relations(productUpdates, ({one}) => ({
	product: one(products, {
		fields: [productUpdates.productId],
		references: [products.id]
	}),
}));
