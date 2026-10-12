import BlurPage from '~/components/visual-editor/global/blur-page'
import MediaComponent from '~/components/visual-editor/media'
import { getMedia } from '~/lib/visual-editor/queries'
import React from 'react'

type Props = {
  params: { subaccountId: string }
}

const MediaPage = async ({ params }: Props) => {
  const data = await getMedia(params.subaccountId)

  return (
    <BlurPage>
      <MediaComponent
        data={data}
        subaccountId={params.subaccountId}
      />
    </BlurPage>
  )
}

export default MediaPage
