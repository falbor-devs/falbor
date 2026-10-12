import InfoBar from '~/components/visual-editor/global/infobar'
import Sidebar from '~/components/visual-editor/sidebar'
import Unauthorized from '~/components/visual-editor/unauthorized'
import {
  getAuthUserDetails,
  getNotificationAndUser,
  verifyAndAcceptInvitation,
} from '~/lib/visual-editor/queries'
import { Role } from '~/lib/db/types'
import { redirect } from 'next/navigation'
import React from 'react'

type Props = {
  children: React.ReactNode
  params: { subaccountId: string }
}

const SubaccountLayout = async ({ children, params }: Props) => {
  const agencyId = await verifyAndAcceptInvitation()
  if (!agencyId) return <Unauthorized />
  const user = await getAuthUserDetails()
  if (!user) {
    return redirect('/')
  }

  if (!user.role) {
    return <Unauthorized />
  }

  let notifications: any = []

  
  const isAgencyLevel = user.role === 'AGENCY_OWNER' || user.role === 'AGENCY_ADMIN'

  if (!isAgencyLevel) {
    
    const hasPermission = user.Permissions?.find(
      (permissions: any) =>
        permissions.access && permissions.subAccountId === params.subaccountId
    )
    if (!hasPermission) {
      return <Unauthorized />
    }
  }

  const allNotifications = await getNotificationAndUser(agencyId)

  if (isAgencyLevel) {
    notifications = allNotifications
  } else {
    const filteredNoti = allNotifications?.filter(
      (item: any) => item.subAccountId === params.subaccountId
    )
    if (filteredNoti) notifications = filteredNoti
  }

  return (
    <div className="h-screen overflow-hidden">
      <Sidebar
        id={params.subaccountId}
        type="subaccount"
      />

      <div className="md:pl-[300px]">
        <InfoBar
          notifications={notifications}
          role={user.role as Role}
          subAccountId={params.subaccountId as string}
          user={{
            name: user.displayName || '',
            email: user.email || '',
          }}
        />


        <div className="relative">{children}</div>
      </div>
    </div>
  )
}

export default SubaccountLayout
