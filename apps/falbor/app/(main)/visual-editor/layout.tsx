import type { Metadata } from 'next'
import { DM_Sans } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '~/providers/visual-editor/theme-provider'
import ModalProvider from '~/providers/visual-editor/modal-provider'
import { Toaster } from '~/components/visual-editor/ui/toaster'
import { Toaster as SonnarToaster } from '~/components/visual-editor/ui/sonner'

const font = DM_Sans({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Plura',
  description: 'All in one Agency Solution',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <ModalProvider>
        {children}
        <Toaster />
        <SonnarToaster position="bottom-left" />
      </ModalProvider>
    </ThemeProvider>
  )
}
