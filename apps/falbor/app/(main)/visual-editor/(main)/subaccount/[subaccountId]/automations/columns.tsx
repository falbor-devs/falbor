'use client'
import { ColumnDef } from '@tanstack/react-table'
import { Automation } from '~/lib/db/schema'
import { Badge } from '~/components/visual-editor/ui/badge'
import { format } from 'date-fns'
import Link from 'next/link'

export const columns: ColumnDef<Automation>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'published',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('published')
      return (
        <Badge variant={status ? 'default' : 'secondary'}>
          {status ? 'Published' : 'Draft'}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'createdAt',
    header: 'Created Date',
    cell: ({ row }) => {
      const date = row.getValue('createdAt') as Date
      return <span>{format(new Date(date), 'MMMM do, yyyy')}</span>
    },
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => {
      const automation = row.original
      return (
        <Link
          href={`/visual-editor/subaccount/${automation.subAccountId}/automations/${automation.id}`}
          className="text-primary hover:underline font-medium"
        >
          Edit
        </Link>
      )
    },
  },
]
