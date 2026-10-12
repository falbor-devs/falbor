'use server'

import { getCurrentUserId } from '~/lib/auth/server'
import { db } from '~/lib/db'
import { redirect } from 'next/navigation'
import {
  users,
  veAgencies,
  veSubAccounts,
  vePermissions,
  veFunnels,
  veFunnelPages,
  veFunnelsProduct,
  veContacts,
  vePipelines,
  veLanes,
  veTickets,
  veTags,
  veTriggers,
  veAutomations,
  veActions,
  Agency,
  Lane,
  Plan,
  Prisma,

  SubAccount,
  Tag,
  Ticket,
  User,
} from '~/lib/db/schema'
import { Role, AgencySidebarOption, Permission, Contact } from '~/lib/db/types'
import { eq, and, inArray, asc } from 'drizzle-orm'
import { v4 } from 'uuid'
import {
  CreateFunnelFormSchema,
  CreateMediaType,
  UpsertFunnelPage,
} from './types'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { cache } from 'react'
import { clerkClient } from '@clerk/nextjs/server'

 const _getAuthUserDetails = cache(async () => {
  const userId = await getCurrentUserId()
  if (!userId) {
    return
  }

  const userData = await db.query.users.findFirst({
    where: eq(users.id, userId),
  })

  if (userData) {
    let agency = null
    if (userData.agencyId) {
      const agencyData = await db.query.veAgencies.findFirst({
        where: eq(veAgencies.id, userData.agencyId),
      })
      if (agencyData) {
        const subAccounts = await db.query.veSubAccounts.findMany({
          where: eq(veSubAccounts.agencyId, userData.agencyId),
        })
        agency = {
          ...agencyData,
          SubAccount: subAccounts,
          SidebarOption: [] as AgencySidebarOption[],
        }
      }
    }
    return { ...userData, Agency: agency, Permissions: [] as Permission[] }
  }

  return null
})

export const getAuthUserDetails = async () => {
  return await _getAuthUserDetails()
}

export const __getUsersWithAgencySubAccountPermissionsSidebarOptions = async (
  agencyId: string
) => {
  return await db.query.users.findFirst({
    where: (table, { eq }) => eq(table.agencyId, agencyId),
    with: {
      Agency: { with: { SubAccount: true } },
      Permissions: { with: { SubAccount: true } },
    },
  })
}

export const saveActivityLogsNotification = async ({
  agencyId,
  description,
  subaccountId,
}: {
  agencyId?: string
  description: string
  subaccountId?: string
}) => {
  const userId = await getCurrentUserId()
  let userData
  if (!userId) {
    console.log('No user for activity log')
  } else {
    userData = await db.query.users.findFirst({
      where: eq(users.id, userId)
    })
  }

  if (!userData) {
    console.log('Could not find a user')
    return
  }

  let foundAgencyId = agencyId
  if (!foundAgencyId) {
    if (!subaccountId) {
      throw new Error(
        'You need to provide atleast an agency Id or subaccount Id'
      )
    }
    const response = await db.query.veSubAccounts.findFirst({
      where: (table, { eq }) => eq(table.id, subaccountId),
    })
    if (response) foundAgencyId = response.agencyId
  }
  console.log(`Log Activity: ${userData.displayName || userData.email} | ${description}`)
}

export const createTeamUser = async (agencyId: string, user: User) => {
  if (user.role === 'AGENCY_OWNER') return null
  const response = await db.insert(users)
    .values({
      id: user.id,
      displayName: user.displayName || user.email,
      avatarUrl: user.avatarUrl,
      email: user.email,
      role: user.role,
      agencyId: user.agencyId,
    })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        displayName: user.displayName || user.email,
        avatarUrl: user.avatarUrl,
        role: user.role,
        agencyId: user.agencyId,
      },
    })
    .returning()
  return response[0]
}

const _verifyAndAcceptInvitation = cache(async () => {
  const userId = await getCurrentUserId()
  if (!userId) return redirect('/sign-in')
  
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId)
  })
  
  return user ? user.agencyId : null
})

export const verifyAndAcceptInvitation = async () => {
  return await _verifyAndAcceptInvitation()
}

export const updateAgencyDetails = async (
  agencyId: string,
  agencyDetails: Partial<Agency>
) => {
  const response = await db.update(veAgencies).set(agencyDetails).where(eq(veAgencies.id, agencyId)).returning()
  return response[0]
}

export const deleteAgency = async (agencyId: string) => {
  const response = await db.delete(veAgencies).where(eq(veAgencies.id, agencyId))
  return response
}

export const initUser = async (newUser: Partial<User>) => {
  const userId = await getCurrentUserId()
  if (!userId) return

  const userData = await db.query.users.findFirst({
    where: eq(users.id, userId),
  })

  return userData
}

export const upsertAgency = async (agency: Agency, price?: Plan) => {
  require('fs').writeFileSync('payload.json', JSON.stringify(agency, null, 2))
  if (!agency.companyEmail) return null
  try {
    const existing = await db.query.veAgencies.findFirst({
      where: eq(veAgencies.id, agency.id)
    });
    let agencyDetails;
    
    const insertData = {
      id: agency.id,
      name: agency.name,
      agencyLogo: agency.agencyLogo,
      companyEmail: agency.companyEmail,
      companyPhone: agency.companyPhone,
      whiteLabel: agency.whiteLabel,
      address: agency.address,
      city: agency.city,
      zipCode: agency.zipCode,
      state: agency.state,
      country: agency.country,
      goal: agency.goal,
      connectAccountId: agency.connectAccountId,
      customerId: agency.customerId,
      createdAt: agency.createdAt ? new Date(agency.createdAt) : new Date(),
      updatedAt: agency.updatedAt ? new Date(agency.updatedAt) : new Date(),
    };

    if (existing) {
      await db.update(veAgencies).set(insertData).where(eq(veAgencies.id, agency.id));
      agencyDetails = insertData;
    } else {
      const [inserted] = await db.insert(veAgencies).values(insertData).returning();
      agencyDetails = inserted;
      
      const userId = await getCurrentUserId();
      if (userId) {
        await db.update(users).set({ agencyId: agency.id, role: 'AGENCY_OWNER' }).where(eq(users.id, userId));
      }
    }
    return agencyDetails;
  } catch (error) {
    console.log(error)
    return null
  }
}

const _getNotificationAndUser = cache(async (agencyId: string) => {
  try {
    return []
  } catch (error) {
    console.log(error)
  }
})

export const getNotificationAndUser = async (agencyId: string) => {
  return await _getNotificationAndUser(agencyId)
}

export const deleteNotification = async (notificationId: string) => {
  try {
  const response = { id: notificationId } as any
  return response
  } catch (error) {
    console.log(error)
  }
}

export const deleteAllNotifications = async (agencyId: string) => {
  try {
    const response = { count: 0 } as any
    return response
  } catch (error) {
    console.log(error)
  }
}

export const markNotificationAsRead = async (notificationId: string) => {
  try {
    const response = { id: notificationId, isRead: true } as any
    return response
  } catch (error) {
    console.log(error)
  }
}

export const upsertSubAccount = async (subAccount: SubAccount) => {
  console.log('🔴 RECEIVED SUBACCOUNT DATA:', subAccount)
  if (!subAccount || !subAccount.companyEmail) {
    console.log('🔴 Error: No company email provided in', subAccount)
    return null
  }
  
  const agencyOwner = await db.query.users.findFirst({
    where: (table, { eq, and }) => and(
      eq(table.agencyId, subAccount.agencyId), 
      eq(table.role, 'AGENCY_OWNER')
    ),
  })
  
  if (!agencyOwner) {
    console.log('🔴 Error: Could not find AGENCY_OWNER for agencyId:', subAccount.agencyId)
    return null
  }
  
  try {
    const response = await db
      .insert(veSubAccounts)
      .values(subAccount)
      .onConflictDoUpdate({
        target: veSubAccounts.id,
        set: subAccount,
      })
      .returning()
      
    if (response && response.length > 0) {
      const perm = await db.query.vePermissions.findFirst({
        where: (table, { eq, and }) => and(eq(table.subAccountId, subAccount.id), eq(table.email, agencyOwner.email))
      })
      
      if (!perm) {
        await db.insert(vePermissions).values({
          id: v4(),
          subAccountId: subAccount.id,
          email: agencyOwner.email,
          access: true,
        })
      }
      
      return response[0]
    }
  } catch (err) {
    console.log('🔴 Drizzle Error in upsertSubAccount:', err)
  }
  return null
}

export const getUserPermissions = async (userId: string) => {
  const response = await db.query.users.findFirst({
    where: (table, { eq }) => eq(table.id, userId),
    with: { Permissions: { with: { SubAccount: true } } },
  })

  return response
}

export const updateUser = async (user: Partial<User>) => {
  const response = await db.update(users).set(user).where(eq(users.email, user.email as string)).returning()

  await (await clerkClient()).users.updateUserMetadata(response[0].id, {
    privateMetadata: {
      role: user.role || 'SUBACCOUNT_USER',
    },
  })

  return response[0]
}

export const changeUserPermissions = async (
  permissionId: string | undefined,
  userEmail: string,
  subAccountId: string,
  permission: boolean
) => {
  try {
    let response;
    
    if (permissionId) {
      const existing = await db.query.vePermissions.findFirst({
        where: (table, { eq }) => eq(table.id, permissionId)
      });
      if (existing) {
        response = await db.update(vePermissions)
          .set({ access: permission })
          .where(eq(vePermissions.id, permissionId))
          .returning();
      }
    }

    if (!response || response.length === 0) {
      const existingByEmail = await db.query.vePermissions.findFirst({
        where: (table, { eq, and }) => and(eq(table.email, userEmail), eq(table.subAccountId, subAccountId))
      });
      if (existingByEmail) {
        response = await db.update(vePermissions)
          .set({ access: permission })
          .where(eq(vePermissions.id, existingByEmail.id))
          .returning();
      } else {
        response = await db.insert(vePermissions)
          .values({
            access: permission,
            email: userEmail,
            subAccountId: subAccountId,
            ...(permissionId ? { id: permissionId } : {})
          })
          .returning();
      }
    }
    return response[0]
  } catch (error) {
    console.log('🔴Could not change persmission', error)
  }
}

export const getSubaccountDetails = async (subaccountId: string) => {
  const response = await db.query.veSubAccounts.findFirst({
    where: (table, { eq }) => eq(table.id, subaccountId),
  })
  return response
}

export const deleteSubAccount = async (subaccountId: string) => {
  const response = await db.delete(veSubAccounts).where(eq(veSubAccounts.id, subaccountId)).returning()
  return response[0]
}

export const deleteUser = async (userId: string) => {
  await (await clerkClient()).users.updateUserMetadata(userId, {
    privateMetadata: {
      role: undefined,
    },
  })
  const deletedUser = await db.delete(users).where(eq(users.id, userId)).returning()

  return deletedUser[0]
}

export const getUser = async (id: string) => {
  const user = await db.query.users.findFirst({
    where: (table, { eq }) => eq(table.id, id),
  })

  return user
}

export const sendInvitation = async (
  role: Role,
  email: string,
  agencyId: string
) => {
  const resposne = { id: v4(), email, agencyId, role } as any

  try {
    await (await clerkClient()).invitations.createInvitation({
      emailAddress: email,
      redirectUrl: process.env.NEXT_PUBLIC_URL,
      publicMetadata: {
        throughInvitation: true,
        role,
      },
    })
  } catch (error: any) {
    if (error?.errors?.[0]?.code === 'already_invited') {
      console.log('User already invited in Clerk')
    } else {
      console.log('Clerk Invitation Error:', error)
    }
  }

  return resposne
}

export const getMedia = async (subaccountId: string) => {
  return { Media: [] as any[] }
}

export const createMedia = async (
  subaccountId: string,
  mediaFile: CreateMediaType
) => {
  return mediaFile as any
}

export const deleteMedia = async (mediaId: string) => {
  return { id: mediaId } as any
}

export const getPipelineDetails = async (pipelineId: string) => {
  const response = await db.query.vePipelines.findFirst({
    where: (table, { eq }) => eq(table.id, pipelineId),
  })
  return response
}

export const getLanesWithTicketAndTags = async (pipelineId: string) => {
  const lanes = await db.query.veLanes.findMany({
    where: (table, { eq }) => eq(table.pipelineId, pipelineId),
  })
  const laneIds = lanes.map((l) => l.id)
  const tickets = laneIds.length > 0
    ? await db.query.veTickets.findMany({
        where: (table, { inArray }) => inArray(table.laneId, laneIds),
      })
    : []
  return lanes
    .sort((a, b) => a.order - b.order)
    .map((lane) => ({
      ...lane,
      Tickets: tickets.filter((t) => t.laneId === lane.id).sort((a, b) => a.order - b.order),
    }))
}

export const upsertFunnel = async (
  subaccountId: string,
  funnel: z.infer<typeof CreateFunnelFormSchema> & { liveProducts: string },
  funnelId: string
) => {
  const insertData = {
    name: funnel.name || 'Untitled Funnel',
    description: funnel.description || '',
    subDomainName: funnel.subDomainName || null,
    favicon: funnel.favicon || null,
    liveProducts: funnel.liveProducts || '[]',
    id: funnelId || v4(),
    subAccountId: subaccountId,
  }

  const response = await db
    .insert(veFunnels)
    .values(insertData)
    .onConflictDoUpdate({
      target: veFunnels.id,
      set: insertData,
    })
    .returning()

  return response[0]
}

export const upsertPipeline = async (
  pipeline: any
) => {
  const id = pipeline.id || v4()
  const response = await db
    .insert(vePipelines)
    .values({ ...pipeline, id })
    .onConflictDoUpdate({
      target: vePipelines.id,
      set: pipeline,
    })
    .returning()

  return response[0]
}

export const deletePipeline = async (pipelineId: string) => {
  const response = await db.delete(vePipelines).where(eq(vePipelines.id, pipelineId)).returning()
  return response[0]
}

export const updateLanesOrder = async (lanes: Lane[]) => {
  try {
    const updateTrans = lanes.map((lane) =>
      db.update(veLanes).set({ order: lane.order }).where(eq(veLanes.id, lane.id))
    )

    await Promise.all(updateTrans)
    console.log('🟢 Done reordered 🟢')
  } catch (error) {
    console.log(error, 'ERROR UPDATE LANES ORDER')
  }
}

export const updateTicketsOrder = async (tickets: Ticket[]) => {
  try {
    const updateTrans = tickets.map((ticket) =>
      db.update(veTickets).set({
        order: ticket.order,
        laneId: ticket.laneId,
      }).where(eq(veTickets.id, ticket.id))
    )

    await Promise.all(updateTrans)
    console.log('🟢 Done reordered 🟢')
  } catch (error) {
    console.log(error, '🔴 ERROR UPDATE TICKET ORDER')
  }
}

export const upsertLane = async (lane: any) => {
  let order: number

  if (!lane.order) {
    const lanes = await db.query.veLanes.findMany({
      where: (table, { eq }) => eq(table.pipelineId, lane.pipelineId),
    })

    order = lanes.length
  } else {
    order = lane.order
  }

  const id = lane.id || v4()
  const response = await db.insert(veLanes)
    .values({ ...lane, id, order })
    .onConflictDoUpdate({
      target: veLanes.id,
      set: lane,
    })
    .returning()

  return response[0]
}

export const deleteLane = async (laneId: string) => {
  const resposne = await db.delete(veLanes).where(eq(veLanes.id, laneId)).returning()
  return resposne[0]
}

export const getTicketsWithTags = async (pipelineId: string) => {
  const lanes = await db.query.veLanes.findMany({
    where: (table, { eq }) => eq(table.pipelineId, pipelineId),
  })
  const laneIds = lanes.map((l) => l.id)
  if (!laneIds.length) return []
  const tickets = await db.query.veTickets.findMany({
    where: (table, { inArray }) => inArray(table.laneId, laneIds),
  })
  return tickets.map((t) => ({ ...t, Tags: [] as Tag[], Assigned: null as User | null, Customer: null as Contact | null }))
}

export const _getTicketsWithAllRelations = async (laneId: string) => {
  const tickets = await db.query.veTickets.findMany({
    where: (table, { eq }) => eq(table.laneId, laneId),
  })
  return tickets.map((t) => ({ ...t, Tags: [] as Tag[], Assigned: null as User | null, Customer: null as Contact | null, Lane: null as any }))
}

export const getSubAccountTeamMembers = async (subaccountId: string) => {
  const subaccount = await db.query.veSubAccounts.findFirst({
    where: (table, { eq }) => eq(table.id, subaccountId),
  })
  if (!subaccount) return []

  const permissions = await db.query.vePermissions.findMany({
    where: (table, { eq, and }) => and(
      eq(table.subAccountId, subaccountId),
      eq(table.access, true)
    ),
    with: {
      User: true
    }
  })

  return permissions
    .map(p => p.User)
    .filter(u => u && u.role === 'SUBACCOUNT_USER' && u.agencyId === subaccount.agencyId)
}

export const searchContacts = async (searchTerms: string) => {
  const response = await db.query.veContacts.findMany({
    where: (table, { ilike }) => ilike(table.name, `%${searchTerms}%`),
  })
  return response
}

export const upsertTicket = async (
  ticket: any,
  tags: Tag[]
) => {
  let order: number
  if (!ticket.order) {
    const tickets = await db.query.veTickets.findMany({
      where: (table, { eq }) => eq(table.laneId, ticket.laneId),
    })
    order = tickets.length
  } else {
    order = ticket.order
  }

  const id = ticket.id || v4()
  const response = await db.insert(veTickets)
    .values({ ...ticket, id, order })
    .onConflictDoUpdate({
      target: veTickets.id,
      set: ticket,
    })
    .returning()

  return { ...response[0], Tags: tags } as any
}

export const deleteTicket = async (ticketId: string) => {
  const response = await db.delete(veTickets).where(eq(veTickets.id, ticketId)).returning()
  return response[0]
}

export const upsertTag = async (
  subaccountId: string,
  tag: any
) => {
  const id = tag.id || v4()
  const response = await db.insert(veTags)
    .values({ ...tag, id, subAccountId: subaccountId })
    .onConflictDoUpdate({
      target: veTags.id,
      set: tag,
    })
    .returning()

  return response[0]
}

export const getTagsForSubaccount = async (subaccountId: string) => {
  const response = await db.query.veSubAccounts.findFirst({
    where: (table, { eq }) => eq(table.id, subaccountId),
    with: { Tags: true },
  })
  return response
}

export const deleteTag = async (tagId: string) => {
  const response = await db.delete(veTags).where(eq(veTags.id, tagId)).returning()
  return response[0]
}

export const upsertContact = async (
  contact: any
) => {
  const insertData = {
    id: contact.id || v4(),
    name: contact.name,
    email: contact.email,
    subAccountId: contact.subAccountId,
  }

  const response = await db
    .insert(veContacts)
    .values(insertData)
    .onConflictDoUpdate({
      target: veContacts.id,
      set: insertData,
    })
    .returning()
  return response[0]
}

export const getFunnels = async (subacountId: string) => {
  const funnels = await db.query.veFunnels.findMany({
    where: (table, { eq }) => eq(table.subAccountId, subacountId),
  })
  const funnelIds = funnels.map((f) => f.id)
  const pages = funnelIds.length > 0
    ? await db.select().from(veFunnelPages).where(inArray(veFunnelPages.funnelId, funnelIds))
    : []
  return funnels.map((f) => ({
    ...f,
    FunnelPages: pages.filter((p) => p.funnelId === f.id),
  }))
}

export const getFunnel = async (funnelId: string) => {
  const funnel = await db.query.veFunnels.findFirst({
    where: (table, { eq }) => eq(table.id, funnelId),
  })
  if (!funnel) return null
  const pages = await db.select().from(veFunnelPages)
    .where(eq(veFunnelPages.funnelId, funnelId))
    .orderBy(asc(veFunnelPages.order))
  return { ...funnel, FunnelPages: pages }
}

export const updateFunnelProducts = async (
  products: string,
  funnelId: string
) => {
  const data = await db
    .update(veFunnels)
    .set({ liveProducts: products })
    .where(eq(veFunnels.id, funnelId))
    .returning()
  return data[0]
}

export const upsertFunnelPage = async (
  subaccountId: string,
  funnelPage: UpsertFunnelPage,
  funnelId: string
) => {
  if (!subaccountId || !funnelId) return

  const insertData = {
    id: funnelPage.id || v4(),
    name: funnelPage.name || 'New Page',
    pathName: funnelPage.pathName || '',
    visits: funnelPage.visits || 0,
    content: funnelPage.content || JSON.stringify([
      {
        content: [],
        id: '__body',
        name: 'Body',
        styles: { backgroundColor: 'white' },
        type: '__body',
      },
    ]),
    order: funnelPage.order ?? 0,
    previewImage: funnelPage.previewImage || null,
    funnelId: funnelId,
  }

  const response = await db
    .insert(veFunnelPages)
    .values(insertData)
    .onConflictDoUpdate({
      target: veFunnelPages.id,
      set: insertData,
    })
    .returning()

  revalidatePath(`/subaccount/${subaccountId}/funnels/${funnelId}`, 'page')
  return response[0]
}

export const deleteFunnelePage = async (funnelPageId: string) => {
  const response = await db
    .delete(veFunnelPages)
    .where(eq(veFunnelPages.id, funnelPageId))
    .returning()
  return response[0]
}

export const getFunnelPageDetails = async (funnelPageId: string) => {
  const response = await db.query.veFunnelPages.findFirst({
    where: (table, { eq }) => eq(table.id, funnelPageId),
  })

  return response
}

export const getDomainContent = async (subDomainName: string) => {
  const funnel = await db.query.veFunnels.findFirst({
    where: (table, { eq }) => eq(table.subDomainName, subDomainName),
  })
  if (!funnel) return null
  const pages = await db.select().from(veFunnelPages).where(eq(veFunnelPages.funnelId, funnel.id))
  return { ...funnel, FunnelPages: pages }
}

export const getPipelines = async (subaccountId: string) => {
  const pipelines = await db.query.vePipelines.findMany({
    where: (table, { eq }) => eq(table.subAccountId, subaccountId),
  })
  const pipelineIds = pipelines.map((p) => p.id)
  const lanes = pipelineIds.length > 0
    ? await db.query.veLanes.findMany({
        where: (table, { inArray }) => inArray(table.pipelineId, pipelineIds),
      })
    : []
  const laneIds = lanes.map((l) => l.id)
  const tickets = laneIds.length > 0
    ? await db.query.veTickets.findMany({
        where: (table, { inArray }) => inArray(table.laneId, laneIds),
      })
    : []
  return pipelines.map((p) => ({
    ...p,
    Lane: lanes
      .filter((l) => l.pipelineId === p.id)
      .map((l) => ({ ...l, Tickets: tickets.filter((t) => t.laneId === l.id) })),
  }))
}

export const savePayPalConfig = async (
  subaccountId: string,
  paypalClientId: string
) => {
  const response = await db.update(veSubAccounts).set({ paypalClientId }).where(eq(veSubAccounts.id, subaccountId)).returning()
  return response[0]
}

export const upsertFunnelProduct = async (product: any) => {
  const insertData = {
    name: product.name,
    price: product.price,
    priceId: product.priceId,
    subAccountId: product.subAccountId,
    id: product.id || v4(),
  }

  const response = await db
    .insert(veFunnelsProduct)
    .values(insertData)
    .onConflictDoUpdate({
      target: veFunnelsProduct.id,
      set: insertData,
    })
    .returning()
  return response[0]
}

export const getFunnelProducts = async (subaccountId: string) => {
  const response = await db.query.veFunnelsProduct.findMany({
    where: (table, { eq }) => eq(table.subAccountId, subaccountId),
  })
  return response
}

export const getAutomations = async (subaccountId: string) => {
  const response = await db.query.veAutomations.findMany({
    where: (table, { eq }) => eq(table.subAccountId, subaccountId),
    with: {
      Trigger: true,
      Action: true,
    },
  })
  return response
}

export const upsertAutomation = async (automation: any) => {
  const id = automation.id || v4()
  const response = await db.insert(veAutomations)
    .values({ ...automation, id })
    .onConflictDoUpdate({
      target: veAutomations.id,
      set: automation,
    })
    .returning()
  return response[0]
}

export const upsertTrigger = async (trigger: any) => {
  const id = trigger.id || v4()
  const response = await db.insert(veTriggers)
    .values({ ...trigger, id })
    .onConflictDoUpdate({
      target: veTriggers.id,
      set: trigger,
    })
    .returning()
  return response[0]
}

export const upsertAction = async (action: any) => {
  const insertData = {
    ...action,
    id: action.id || v4(),
  }

  const response = await db
    .insert(veActions)
    .values(insertData)
    .onConflictDoUpdate({
      target: veActions.id,
      set: insertData,
    })
    .returning()
  return response[0]
}
