import { db } from '~/lib/visual-editor/db'
import React from 'react'
import { getAuthUserDetails } from '~/lib/visual-editor/queries'
import DataTable from './data-table'
import { Plus } from 'lucide-react'
import { columns } from './columns'
import SendInvitation from '~/components/visual-editor/forms/send-invitation'

type Props = {
  params: { agencyId: string }
}

const TeamPage = async ({ params }: Props) => {
  const authUser = await getAuthUserDetails()
  const teamMembers = await db.query.users.findMany({
    where: (table, { eq }) => eq(table.agencyId, params.agencyId),
    with: {
      Agency: { with: { SubAccount: true } },
      Permissions: { with: { SubAccount: true } },
    },
  })

  if (!authUser) return null
  const agencyDetails = await db.query.veAgencies.findFirst({
    where: (table, { eq }) => eq(table.id, params.agencyId),
    with: {
      SubAccount: true,
    },
  })

  if (!agencyDetails) return

  return (
    <DataTable
      actionButtonText={
        <>
          <Plus size={15} />
          Add
        </>
      }
      modalChildren={<SendInvitation agencyId={agencyDetails.id} />}
      filterValue="name"
      columns={columns}
      data={teamMembers}
    ></DataTable>
  )
}

export default TeamPage
