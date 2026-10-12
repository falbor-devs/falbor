'use server'
import { clerkClient } from '@clerk/nextjs/server'

export async function joinWaitlistAction(email: string) {
  try {
    const client = await clerkClient()
    await client.waitlistEntries.create({
      emailAddress: email,
    })
    return { success: true }
  } catch (error: any) {
    console.error('Waitlist Error:', error)
    return { 
      error: error.errors?.[0]?.message || 'Failed to join waitlist. Please try again later.' 
    }
  }
}

export async function getWaitlistCount() {
  try {
    const client = await clerkClient()
    const { totalCount } = await client.waitlistEntries.list()
    return totalCount + 80
  } catch (error) {
    return 80
  }
}
