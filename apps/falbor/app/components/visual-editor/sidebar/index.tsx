import { getAuthUserDetails, getNotificationAndUser } from '~/lib/visual-editor/queries'
import { off } from 'process'
import React from 'react'
import MenuOptions from './menu-options'

type Props = {
  id: string
  type: 'agency' | 'subaccount'
}

const Sidebar = async ({ id, type }: Props) => {
  const user = await getAuthUserDetails()
  if (!user) return null

  if (!user.Agency) return

  const details =
    type === 'agency'
      ? user?.Agency
      : user?.Agency.SubAccount.find((subaccount) => subaccount.id === id)

  const isWhiteLabeledAgency = user.Agency.whiteLabel
  if (!details) return

  let sideBarLogo = user.Agency.agencyLogo || '/assets/plura-logo.svg'

  if (!isWhiteLabeledAgency) {
    if (type === 'subaccount') {
      sideBarLogo =
        user?.Agency.SubAccount.find((subaccount) => subaccount.id === id)
          ?.subAccountLogo || user.Agency.agencyLogo
    }
  }

  const sidebarOpt =
    type === 'agency'
      ? (user.Agency as any).SidebarOption?.length
        ? (user.Agency as any).SidebarOption
        : [
            { id: '1', name: 'Launchpad', link: `/visual-editor/agency/${user.Agency.id}/launchpad`, icon: 'clipboardIcon', agencyId: user.Agency.id, createdAt: new Date(), updatedAt: new Date() },
            { id: '2', name: 'Sub Accounts', link: `/visual-editor/agency/${user.Agency.id}/all-subaccounts`, icon: 'person', agencyId: user.Agency.id, createdAt: new Date(), updatedAt: new Date() },
            { id: '3', name: 'Team', link: `/visual-editor/agency/${user.Agency.id}/team`, icon: 'shield', agencyId: user.Agency.id, createdAt: new Date(), updatedAt: new Date() },
            { id: '4', name: 'Settings', link: `/visual-editor/agency/${user.Agency.id}/settings`, icon: 'settings', agencyId: user.Agency.id, createdAt: new Date(), updatedAt: new Date() }
          ]
      : (user.Agency.SubAccount.find((subaccount) => subaccount.id === id) as any)?.SidebarOption?.length
        ? (user.Agency.SubAccount.find((subaccount) => subaccount.id === id) as any)?.SidebarOption
        : [
            { id: '1', name: 'Launchpad', link: `/visual-editor/subaccount/${id}/launchpad`, icon: 'clipboardIcon', subAccountId: id, createdAt: new Date(), updatedAt: new Date() },
            { id: '2', name: 'Funnels', link: `/visual-editor/subaccount/${id}/funnels`, icon: 'pipelines', subAccountId: id, createdAt: new Date(), updatedAt: new Date() },
            { id: '3', name: 'Contacts', link: `/visual-editor/subaccount/${id}/contacts`, icon: 'person', subAccountId: id, createdAt: new Date(), updatedAt: new Date() },
            { id: '4', name: 'Settings', link: `/visual-editor/subaccount/${id}/settings`, icon: 'settings', subAccountId: id, createdAt: new Date(), updatedAt: new Date() }
          ]

  const subaccounts = user.Agency.SubAccount.filter((subaccount) =>
    user.Permissions.find(
      (permission) =>
        permission.subAccountId === subaccount.id && permission.access
    )
  )

  const notifications = await getNotificationAndUser(user.Agency.id)

  return (
    <>
      <MenuOptions
        defaultOpen={true}
        details={details}
        id={id}
        sidebarLogo={sideBarLogo}
        sidebarOpt={sidebarOpt}
        subAccounts={subaccounts}
        user={user}
        notifications={notifications}
      />
      <MenuOptions
        details={details}
        id={id}
        sidebarLogo={sideBarLogo}
        sidebarOpt={sidebarOpt}
        subAccounts={subaccounts}
        user={user}
        notifications={notifications}
      />
    </>
  )
}


export default Sidebar
