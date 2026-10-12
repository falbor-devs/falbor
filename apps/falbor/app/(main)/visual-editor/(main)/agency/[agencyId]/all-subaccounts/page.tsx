import { getAuthUserDetails } from '~/lib/visual-editor/queries'
import React from 'react'
import CreateSubaccountButton from './_components/create-subaccount-btn'
import SubAccountList from './_components/subaccount-list'

type Props = {
  params: { agencyId: string }
}

const AllSubaccountsPage = async ({ params }: Props) => {
  const user = await getAuthUserDetails()
  if (!user) return <div>No user found</div>

  const subAccounts = user.Agency?.SubAccount ?? []

  return (
    <div className="flex flex-col">
      <CreateSubaccountButton
        user={user}
        id={params.agencyId}
        className="w-[200px] self-end m-6"
      />

      <SubAccountList subAccounts={subAccounts} />
    </div>
  )
}

export default AllSubaccountsPage