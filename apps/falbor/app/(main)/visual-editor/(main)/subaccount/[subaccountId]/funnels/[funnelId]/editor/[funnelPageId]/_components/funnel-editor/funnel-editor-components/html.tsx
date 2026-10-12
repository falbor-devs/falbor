'use client'

import { EditorElement } from '~/providers/visual-editor/editor/editor-provider'
import React from 'react'

type Props = {
  element: EditorElement
}

const HtmlComponent = ({ element }: Props) => {
  const htmlContent = !Array.isArray(element.content) ? element.content.innerHtml || '' : ''

  return (
    <div
      style={element.styles}
      className="p-[2px] w-full m-[5px] relative text-[16px] transition-all"
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  )
}

export default HtmlComponent
