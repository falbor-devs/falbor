import AgencyDetails from '~/components/visual-editor/forms/agency-details'
import UserDetails from '~/components/visual-editor/forms/user-details'
import { db } from '~/lib/visual-editor/db'
import React from 'react'
import { getAuthUserDetails } from '~/lib/visual-editor/queries'

type Props = {
  params: { agencyId: string }
}

const SettingsPage = async ({ params }: Props) => {
  const authUser = await getAuthUserDetails()
  if (!authUser) return null

  const userDetails = await db.query.users.findFirst({
    where: (table, { eq }) => eq(table.email, authUser.email),
  })

  if (!userDetails) return null
  const agencyDetails = await db.query.veAgencies.findFirst({
    where: (table, { eq }) => eq(table.id, params.agencyId),
    with: {
      SubAccount: true,
    },
  })

  if (!agencyDetails) return null

  const subAccounts = agencyDetails.SubAccount

  return (
    <div className="flex lg:!flex-row flex-col gap-4">
      <AgencyDetails data={agencyDetails} />
      <UserDetails
        type="agency"
        id={params.agencyId}
        subAccounts={subAccounts}
        userData={userDetails}
      />
    </div>
  )
}

export default SettingsPage
