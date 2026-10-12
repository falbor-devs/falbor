import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import type {
  users,
  veAgencies,
  veSubAccounts,
  vePermissions,
  veTags,
  vePipelines,
  veLanes,
  veTickets,
  veTriggers,
  veAutomations,
  veActions,
  veFunnels,
  veFunnelPages,
  veFunnelsProduct,
  templates,
  templateReviews,
} from './schema'
export type Role = 'AGENCY_OWNER' | 'AGENCY_ADMIN' | 'SUBACCOUNT_USER' | 'SUBACCOUNT_GUEST'
export type User = InferSelectModel<typeof users>
export type Agency = InferSelectModel<typeof veAgencies>
export type SubAccount = InferSelectModel<typeof veSubAccounts>
export type Permission = InferSelectModel<typeof vePermissions>
export type Tag = InferSelectModel<typeof veTags>
export type Pipeline = InferSelectModel<typeof vePipelines>
export type Lane = InferSelectModel<typeof veLanes>
export type Ticket = InferSelectModel<typeof veTickets>
export type Trigger = InferSelectModel<typeof veTriggers>
export type Automation = InferSelectModel<typeof veAutomations>
export type Action = InferSelectModel<typeof veActions>
export type Funnel = InferSelectModel<typeof veFunnels>
export type FunnelPage = InferSelectModel<typeof veFunnelPages>
export type FunnelProduct = InferSelectModel<typeof veFunnelsProduct>
export type Template = InferSelectModel<typeof templates>
export type TemplateReview = InferSelectModel<typeof templateReviews>
export type NewUser = InferInsertModel<typeof users>
export type NewAgency = InferInsertModel<typeof veAgencies>
export type NewSubAccount = InferInsertModel<typeof veSubAccounts>
export type NewFunnel = InferInsertModel<typeof veFunnels>
export type NewFunnelPage = InferInsertModel<typeof veFunnelPages>
export type AgencyWithSubAccounts = Agency & {
  SubAccount: SubAccount[]
}

export type UserWithAgency = User & {
  Agency: AgencyWithSubAccounts | null
  Permissions: Permission[]
}

export type FunnelWithPages = Funnel & {
  FunnelPages: FunnelPage[]
}

export type LaneWithTickets = Lane & {
  Tickets: Ticket[]
}

export type PipelineWithLanes = Pipeline & {
  Lanes: LaneWithTickets[]
}

export type Plan = 'price_1OYxkqFj9oKEERu1NbKUxXxN' | 'price_1OYxkqFj9oKEERu1KfJXJ7GH'
export type AgencySidebarOption = {
  id: string
  name: string
  link: string
  icon: string
  agencyId: string
  createdAt: Date
  updatedAt: Date
}
export type Contact = {
  id: string
  name: string
  email: string
  createdAt: Date
  updatedAt: Date
  subAccountId: string
}
export namespace Prisma {
  export type PromiseReturnType<T extends (...args: any) => Promise<any>> =
    Awaited<ReturnType<T>>
}

export enum ActionType {
  CREATE_CONTACT = 'CREATE_CONTACT',
}

export enum TriggerTypes {
  CONTACT_FORM = 'CONTACT_FORM',
}
