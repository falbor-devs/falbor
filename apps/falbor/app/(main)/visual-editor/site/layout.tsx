import Navigation from '~/components/visual-editor/site/navigation'
import React from 'react'

const layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <main className="h-full">
      {}
      {children}
    </main>
  )
}

export default layout