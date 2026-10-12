import BlurPage from '~/components/visual-editor/global/blur-page'
import InfoBar from '~/components/visual-editor/global/infobar'
import Sidebar from '~/components/visual-editor/sidebar'
import Unauthorized from '~/components/visual-editor/unauthorized'
import {
  getNotificationAndUser,
  verifyAndAcceptInvitation,
  getAuthUserDetails,
} from '~/lib/visual-editor/queries'
import { redirect } from 'next/navigation'
import React from 'react'

type Props = {
  children: React.ReactNode
  params: { agencyId: string }
}

const layout = async ({ children, params }: Props) => {
  const agencyId = await verifyAndAcceptInvitation()
  const user = await getAuthUserDetails()

  if (!user) {
    return redirect('/')
  }

  if (!agencyId) {
    return redirect('/visual-editor/agency')
  }

  if (
    user.role !== 'AGENCY_OWNER' &&
    user.role !== 'AGENCY_ADMIN'
  )
    return <Unauthorized />

  let allNoti: any = []
  const notifications = await getNotificationAndUser(agencyId)
  if (notifications) allNoti = notifications



  return (
    <div className="h-screen overflow-hidden">
      <Sidebar
        id={params.agencyId}
        type="agency"
      />
      <div className="md:pl-[300px]">
        <InfoBar
          notifications={allNoti}
          role={allNoti.User?.role}
          user={{
            name: user.displayName || '',
            email: user.email,
          }}
        />


        <div className="relative">
          <BlurPage>{children}</BlurPage>
        </div>
      </div>
    </div>
  )
}

export default layout
