'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '~/components/visual-editor/ui/alert-dialog'
import { Button } from '~/components/visual-editor/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '~/components/visual-editor/ui/command'
import { SubAccount } from '~/lib/db/schema'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'
import DeleteButton from './delete-button'

type Props = {
  subAccounts: SubAccount[]
}

const SubAccountList = ({ subAccounts }: Props) => {
  return (
    <Command className="rounded-xl bg-card border shadow-sm pointer-events-auto">
      <CommandInput placeholder="Search Account..." className="h-12" />

      <CommandList>
        <CommandEmpty>No Results Found.</CommandEmpty>
        <CommandGroup heading="Sub Accounts">
          {subAccounts.length ? (
            subAccounts.map((subaccount) => (
              <CommandItem
                key={subaccount.id}
                value={subaccount.name}
                className="h-32 bg-background my-2 border border-border p-4 rounded-xl hover:bg-muted/80 transition-all group relative overflow-hidden pointer-events-auto"
                onSelect={() => { }}
              >
                {}
                <Link
                  href={`/visual-editor/subaccount/${subaccount.id}`}
                  className="flex gap-4 w-full h-full pointer-events-auto"
                >
                  <div className="relative w-32 flex-shrink-0">
                    <Image
                      src={subaccount.subAccountLogo || '/placeholder.svg'}
                      alt="subaccount logo"
                      fill
                      className="rounded-md object-contain bg-muted/50 p-4"
                    />
                  </div>
                  <div className="flex flex-col justify-between flex-1 min-w-0 py-1">
                    <div>
                      <p className="font-semibold truncate">{subaccount.name}</p>
                      <span className="text-muted-foreground text-xs truncate">
                        {subaccount.address}
                      </span>
                    </div>
                  </div>
                </Link>

                {}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-auto"
                    >
                      Delete
                    </Button>
                  </AlertDialogTrigger>

                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the
                        subaccount and all related data.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction className="bg-destructive hover:bg-destructive">
                        <DeleteButton subaccountId={subaccount.id} />
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CommandItem>
            ))
          ) : (
            <div className="text-muted-foreground text-center p-8">
              No Sub accounts yet
            </div>
          )}
        </CommandGroup>
      </CommandList>
    </Command>
  )
}

export default SubAccountList
