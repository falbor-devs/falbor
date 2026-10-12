import AgencyDetails from '~/components/visual-editor/forms/agency-details'
import { getAuthUserDetails, verifyAndAcceptInvitation } from '~/lib/visual-editor/queries'
import { Plan } from '~/lib/db/schema'
import { redirect } from 'next/navigation'
import React from 'react'

const Page = async ({
  searchParams,
}: {
  searchParams: { plan: Plan; state: string; code: string }
}) => {
  const agencyId = await verifyAndAcceptInvitation()
  console.log(agencyId)

  
  const user = await getAuthUserDetails()
  if (agencyId) {
    if (user?.role === 'SUBACCOUNT_GUEST' || user?.role === 'SUBACCOUNT_USER') {
      return redirect('/visual-editor/subaccount')
    } else if (user?.role === 'AGENCY_OWNER' || user?.role === 'AGENCY_ADMIN') {
      if (searchParams.plan) {
        return redirect(`/visual-editor/agency/${agencyId}/billing?plan=${searchParams.plan}`)
      }
      if (searchParams.state) {
        const statePath = searchParams.state.split('___')[0]
        const stateAgencyId = searchParams.state.split('___')[1]
        if (!stateAgencyId) return <div>Not authorized</div>
        return redirect(
          `/visual-editor/agency/${stateAgencyId}/${statePath}?code=${searchParams.code}`
        )
      } else return redirect(`/visual-editor/agency/${agencyId}`)
    } else {
      return <div>Not authorized</div>
    }
  }
  const authUser = user
  if (!authUser) {
    return redirect('/')
  }
  return (
    <div className="flex justify-center items-center mt-4">
      <div className="max-w-[850px] border-[1px] p-4 rounded-xl">
        <h1 className="text-4xl"> Create An Agency</h1>
        <AgencyDetails
          data={{ companyEmail: authUser?.email }}
        />
      </div>
    </div>
  )
}

export default Page
