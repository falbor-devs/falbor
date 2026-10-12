'use client'
import MediaComponent from '~/components/visual-editor/media'
import { getMedia } from '~/lib/visual-editor/queries'
import { GetMediaFiles } from '~/lib/visual-editor/types'
import React, { useEffect, useState } from 'react'

type Props = {
  subaccountId: string
}

const MediaBucketTab = (props: Props) => {
  const [data, setdata] = useState<GetMediaFiles>({ Media: [] })

  useEffect(() => {
    const fetchData = async () => {
      const response = await getMedia(props.subaccountId)
      setdata(response)
    }
    fetchData()
  }, [props.subaccountId])

  return (
    <div className="h-[900px] overflow-scroll p-4">
      <MediaComponent
        data={data}
        subaccountId={props.subaccountId}
      />
    </div>
  )
}

export default MediaBucketTab
