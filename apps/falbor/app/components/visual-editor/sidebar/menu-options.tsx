'use client'
import {
  Agency,
  AgencySidebarOption,
  SubAccount,
} from '~/lib/db/schema'
import { usePathname, useRouter } from 'next/navigation'
import React, { useEffect, useMemo, useState } from 'react'
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../ui/sheet'
import { Button } from '../ui/button'
import { Bell, Check, ChevronsUpDown, Compass, Menu, PlusCircleIcon, Trash, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import { AspectRatio } from '../ui/aspect-ratio'
import Image from 'next/image'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandList,
} from '../ui/command'
import Link from 'next/link'
import { useModal } from '~/providers/visual-editor/modal-provider'
import CustomModal from '../global/custom-modal'
import SubAccountDetails from '../forms/subaccount-details'
import { Separator } from '../ui/separator'
import { icons } from '~/lib/visual-editor/constants'
import { NotificationWithUser } from '~/lib/visual-editor/types'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { deleteAllNotifications, deleteNotification, markNotificationAsRead } from '~/lib/visual-editor/queries'

type Props = {
  defaultOpen?: boolean
  subAccounts: SubAccount[]
  sidebarOpt: AgencySidebarOption[] | any[]
  sidebarLogo: string
  details: any
  user: any
  id: string
  notifications?: NotificationWithUser | []
}

const MenuOptions = ({
  details,
  sidebarLogo,
  sidebarOpt,
  subAccounts,
  user,
  defaultOpen,
  notifications,
  id,
}: Props) => {
  const pathname = usePathname()
  const router = useRouter()
  const { setOpen } = useModal()
  const [isMounted, setIsMounted] = useState(false)
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  const openState = useMemo(
    () => (defaultOpen ? { open: true } : {}),
    [defaultOpen]
  )

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) return null
  if (pathname.includes('/editor')) return null

  const handleAccountSwitch = (url: string) => {
    router.push(url)
    if (!defaultOpen) setIsSheetOpen(false)
  }

  const SidebarContent = (
    <div
      className={clsx(
        'bg-background/80 backdrop-blur-xl fixed top-0 border-r-[1px] w-[300px] h-screen z-[100] flex flex-col',
        {
          'hidden md:flex': defaultOpen,
          'flex md:hidden w-full': !defaultOpen,
        }
      )}
    >
      {}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image
            src="/assets/falbob-logo.png"
            alt="Sidebar Logo"
            width={30}
            height={20}
            className="rounded-md object-contain"
          />
          <h1 className="text-2xl font-bold">Falbbob</h1>
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full w-9 h-9 bg-none border-dashed border flex items-center justify-center"
            >
              <Bell size={17} />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="overflow-scroll w-full sm:max-w-[400px]"
          >
            <SheetHeader className="text-left mb-4">
              <div className="flex items-center justify-between">
                <SheetTitle>Notifications</SheetTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive flex gap-2"
                  onClick={async () => {
                    await deleteAllNotifications(user.Agency.id)
                    router.refresh()
                  }}
                >
                  <Trash2 size={14} />
                  Clear All
                </Button>
              </div>
            </SheetHeader>
            <Tabs
              defaultValue="unread"
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="unread">Unread</TabsTrigger>
                <TabsTrigger value="all">All</TabsTrigger>
              </TabsList>
              <TabsContent value="unread">
                <div className="flex flex-col gap-y-4">
                  {notifications
                    ?.filter((n: any) => !n.isRead)
                    .map((notification: any) => (
                      <div
                        key={notification.id}
                        className="flex flex-col gap-y-2 mb-2 overflow-x-scroll text-ellipsis"
                      >
                        <div className="flex gap-2">
                          <Avatar>
                            <AvatarImage
                              src={notification.User.avatarUrl ?? undefined}
                              alt="Profile Picture"
                            />
                            <AvatarFallback className="bg-primary">
                              {notification.User.name
                                .slice(0, 2)
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col flex-1">
                            <p>
                              <span className="font-bold">
                                {notification.notification.split('|')[0]}
                              </span>
                              <span className="text-muted-foreground">
                                {notification.notification.split('|')[1]}
                              </span>
                              <span className="font-bold">
                                {notification.notification.split('|')[2]}
                              </span>
                            </p>
                            <small className="text-xs text-muted-foreground">
                              {new Date(
                                notification.createdAt
                              ).toLocaleString()}
                            </small>
                            <div className="flex gap-2 mt-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 flex gap-1 bg-muted hover:bg-none hover:text-white hover:text-red-600"
                                onClick={async () => {
                                  await markNotificationAsRead(
                                    notification.id
                                  )
                                  router.refresh()
                                }}
                              >
                                Mark as read
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 flex gap-1 text-red-600 bg-red-200 hover:bg-red-200 hover:text-red-600"
                                onClick={async () => {
                                  await deleteNotification(notification.id)
                                  router.refresh()
                                }}
                              >
                                <Trash size={12} />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  {notifications?.filter((n: any) => !n.isRead).length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                      <Bell className="h-10 w-10 mb-2 opacity-20" />
                      <p>No unread notifications</p>
                    </div>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="all">
                <div className="flex flex-col gap-y-4">
                  {notifications?.map((notification: any) => (
                    <div
                      key={notification.id}
                      className={clsx(
                        'flex flex-col gap-y-2 mb-2 overflow-x-scroll text-ellipsis',
                        notification.isRead && 'opacity-60'
                      )}
                    >
                      <div className="flex gap-2">
                        <Avatar>
                          <AvatarImage
                            src={notification.User.avatarUrl ?? undefined}
                            alt="Profile Picture"
                          />
                          <AvatarFallback className="bg-primary">
                            {notification.User.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col flex-1">
                          <p>
                            <span className="font-bold">
                              {notification.notification.split('|')[0]}
                            </span>
                            <span className="text-muted-foreground">
                              {notification.notification.split('|')[1]}
                            </span>
                            <span className="font-bold">
                              {notification.notification.split('|')[2]}
                            </span>
                          </p>
                          <small className="text-xs text-muted-foreground">
                            {new Date(
                              notification.createdAt
                            ).toLocaleString()}
                          </small>
                          <div className="flex gap-2 mt-2">
                            {!notification.isRead && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 flex gap-1 bg-muted hover:bg-none hover:text-white hover:text-red-600"
                                onClick={async () => {
                                  await markNotificationAsRead(
                                    notification.id
                                  )
                                  router.refresh()
                                }}
                              >
                                <Check size={12} />
                                Mark as read
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 flex gap-1 text-red-600 bg-red-200 hover:bg-red-200 hover:text-red-600"
                              onClick={async () => {
                                await deleteNotification(notification.id)
                                router.refresh()
                              }}
                            >
                              <Trash size={12} />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {notifications?.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                      <Bell className="h-10 w-10 mb-2 opacity-20" />
                      <p>No notifications found</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>

          </SheetContent>
        </Sheet>
      </div>

      {}
      <div className="flex-1 overflow-y-auto px-4">
        {}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              className="w-full border dark:bg-card bg-white border-dashed border-border mb-4 flex items-center justify-between py-4 text-sm h-14"
              variant="ghost"
            >
              <div className="flex items-center text-left gap-2">
                <Compass size={16} />
                <div className="flex flex-col text-xs">
                  {details.name}
                  <span className="text-muted-foreground text-[10px]">
                    {details.address}
                  </span>
                </div>
              </div>
              <ChevronsUpDown
                size={14}
                className="text-muted-foreground"
              />
            </Button>
          </PopoverTrigger>

          <PopoverContent
            className="w-80 h-[420px] mt-2 z-[200] p-0"
            align="start"
            sideOffset={5}
          >
            <Command className="rounded-lg h-full flex flex-col">
              <CommandInput placeholder="Search Accounts..." />
              <CommandList className="flex-1">
                <CommandEmpty>No results found</CommandEmpty>

                {(user?.role === 'AGENCY_OWNER' ||
                  user?.role === 'AGENCY_ADMIN') &&
                  user?.Agency && (
                    <CommandGroup heading="Agency">
                      <div
                        onClick={() =>
                          handleAccountSwitch(`/visual-editor/agency/${user.Agency.id}`)
                        }
                        className="p-3 mx-2 my-1 rounded-md hover:bg-muted cursor-pointer flex gap-4 border border-dashed border-border"
                      >
                        <div className="relative w-16 flex-shrink-0">
                          <Image
                            src={user.Agency.agencyLogo}
                            alt="Agency Logo"
                            fill
                            className="rounded-md object-contain"
                          />
                        </div>
                        <div className="flex flex-col flex-1 text-xs">
                          {user.Agency.name}
                          <span className="text-muted-foreground text-[10px]">
                            {user.Agency.address}
                          </span>
                        </div>
                      </div>
                    </CommandGroup>
                  )}

                <CommandGroup heading="Accounts">
                  {subAccounts?.length ? (
                    subAccounts.map((subaccount) => (
                      <div
                        key={subaccount.id}
                        onClick={() =>
                          handleAccountSwitch(`/visual-editor/subaccount/${subaccount.id}`)
                        }
                        className="p-3 mx-2 my-1 rounded-md hover:bg-muted cursor-pointer flex gap-4"
                      >
                        <div className="relative w-16 flex-shrink-0">
                          <Image
                            src={subaccount.subAccountLogo}
                            alt="subaccount Logo"
                            fill
                            className="rounded-md object-contain"
                          />
                        </div>
                        <div className="flex flex-col flex-1 text-xs">
                          {subaccount.name}
                          <span className="text-muted-foreground text-[10px]">
                            {subaccount.address}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-muted-foreground text-xs">
                      No Accounts
                    </div>
                  )}
                </CommandGroup>
              </CommandList>
            </Command>

            {(user?.role === 'AGENCY_OWNER' ||
              user?.role === 'AGENCY_ADMIN') && (
                <div className="p-4 border-t">
                  {!defaultOpen ? (
                    <SheetClose asChild>
                      <Button
                        className="w-full flex gap-2 h-7 text-xs"
                        onClick={() => {
                          setOpen(
                            <CustomModal
                              title="Create A Subaccount"
                              subheading="You can switch between your agency account and the subaccount from the sidebar"
                            >
                              <SubAccountDetails
                                agencyDetails={user?.Agency as Agency}
                                userId={user?.id as string}
                                userName={user?.name}
                              />
                            </CustomModal>
                          )
                        }}
                      >
                        <PlusCircleIcon size={13} />
                        Create Sub Account
                      </Button>
                    </SheetClose>
                  ) : (
                    <Button
                      className="w-full flex gap-2 h-7 text-xs"
                      onClick={() => {
                        setOpen(
                          <CustomModal
                            title="Create A Subaccount"
                            subheading="You can switch between your agency account and the subaccount from the sidebar"
                          >
                            <SubAccountDetails
                              agencyDetails={user?.Agency as Agency}
                              userId={user?.id as string}
                              userName={user?.name}
                            />
                          </CustomModal>
                        )
                      }}
                    >
                      <PlusCircleIcon size={13} />
                      Create Sub Account
                    </Button>
                  )}
                </div>
              )}
          </PopoverContent>
        </Popover>

        {}
        <nav>
          <div className="space-y-1">
            {sidebarOpt.map((sidebarOptions) => {
              const result = icons.find(
                (icon) => icon.value === sidebarOptions.icon
              )
              const IconComponent = result?.path

              return (
                <div key={sidebarOptions.id}>
                  {defaultOpen ? (
                    <Link
                      href={sidebarOptions.link}
                      className="flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-muted transition-all w-full"
                    >
                      {IconComponent && <IconComponent />}
                      <span>
                        {sidebarOptions.name === 'Funnels'
                          ? 'Pages'
                          : sidebarOptions.name}
                      </span>
                    </Link>
                  ) : (
                    <SheetClose asChild>
                      <Link
                        href={sidebarOptions.link}
                        className="flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-muted transition-all w-full"
                      >
                        {IconComponent && <IconComponent />}
                        <span>
                          {sidebarOptions.name === 'Funnels'
                            ? 'Pages'
                            : sidebarOptions.name}
                        </span>
                      </Link>
                    </SheetClose>
                  )}
                </div>
              )
            })}
          </div>
        </nav>
      </div>
    </div>
  )



  return defaultOpen ? (
    SidebarContent
  ) : (
    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen} modal={false}>
      <SheetTrigger asChild className="absolute left-4 top-4 z-[100] md:!hidden">
        <Button variant="outline" size="icon" className="h-7 w-7">
          <Menu size={16} />
        </Button>
      </SheetTrigger>

      <SheetContent
        side="left"
        className="p-0 w-full sm:w-[300px] bg-transparent border-r-0"
      >
        {SidebarContent}
      </SheetContent>
    </Sheet>
  )
}

export default MenuOptions