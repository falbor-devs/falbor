import { ModeToggle } from '~/components/visual-editor/global/mode-toggle'
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

type Props = {
  user?: any
}

const Navigation = ({ user }: Props) => {
  return (
    <div className="fixed top-0 right-0 left-0 p-4 flex items-center justify-between z-10">
      <aside className="flex items-center gap-2">
        <Image
          src="/assets/falbob-logo.png"
          width={40}
          height={40}
          alt="falbob logo"
        />
        <span className="text-xl font-bold"> Falbob.</span>
      </aside>
      <nav className="hidden md:block absolute left-[50%] top-[50%] transform translate-x-[-50%] translate-y-[-50%]">
        <ul className="flex items-center justify-center gap-8">
          <Link href={'#'}>Pricing</Link>
          <Link href={'#'}>About</Link>
          <Link href={'#'}>Documentation</Link>
          <Link href={'#'}>Features</Link>
        </ul>
      </nav>
      <aside className="flex gap-2 items-center">
        <Link
          href={'/visual-editor/agency'}
          className="bg-primary text-white p-2 px-4 rounded-md hover:bg-primary/80"
        >
          Login
        </Link>
        {user && (
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.avatarUrl ?? undefined} alt="Profile" />
            <AvatarFallback className="bg-primary/10">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
        )}
        <ModeToggle />
      </aside>
    </div>
  )
}

export default Navigation
