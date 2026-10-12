import SubAccountDetails from '~/components/visual-editor/forms/subaccount-details'
import UserDetails from '~/components/visual-editor/forms/user-details'
import BlurPage from '~/components/visual-editor/global/blur-page'
import { db } from '~/lib/visual-editor/db'
import React from 'react'
import { getAuthUserDetails } from '~/lib/visual-editor/queries'

type Props = {
  params: { subaccountId: string }
}

const SubaccountSettingPage = async ({ params }: Props) => {
  const authUser = await getAuthUserDetails()
  if (!authUser) return
  const userDetails = await db.query.users.findFirst({
    where: (table, { eq }) => eq(table.email, authUser.email),
  })
  if (!userDetails) return

  const subAccount = await db.query.veSubAccounts.findFirst({
    where: (table, { eq }) => eq(table.id, params.subaccountId),
  })
  if (!subAccount) return

  const agencyDetails = await db.query.veAgencies.findFirst({
    where: (table, { eq }) => eq(table.id, subAccount.agencyId),
    with: { SubAccount: true },
  })

  if (!agencyDetails) return
  const subAccounts = agencyDetails.SubAccount

  return (
    <BlurPage>
      <div className="flex lg:!flex-row flex-col gap-4">
        <SubAccountDetails
          agencyDetails={agencyDetails}
          details={subAccount}
          userId={userDetails.id}
          userName={userDetails.displayName || userDetails.email || 'Unknown'}
        />
        <UserDetails
          type="subaccount"
          id={params.subaccountId}
          subAccounts={subAccounts}
          userData={userDetails}
        />
      </div>
    </BlurPage>
  )
}

export default SubaccountSettingPage
