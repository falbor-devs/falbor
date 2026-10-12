'use client';

import { ClientOnly } from '~/components/ui/ClientOnly';
import { Menu } from '~/components/sidebar/Menu.client';

export function ClientSidebar() {
  return <ClientOnly>{() => <Menu />}</ClientOnly>;
}
