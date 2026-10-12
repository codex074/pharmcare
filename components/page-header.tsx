import Link from 'next/link'
import { requireUser } from '@/lib/auth/dal'
import { bangkokDate, thaiDateLong } from '@/lib/thai-date'
import { Icon } from './icons'
import { MenuButton } from './shell'

export async function PageHeader({ title, back }: { title: string; back?: { href: string; label: string } }) {
  const user = await requireUser()
  return (
    <header className="hdr">
      {back ? (
        <Link className="btn btn-sm" href={back.href} style={{ gap: 6 }}>
          <Icon name="back" size="sm" />
          <span className="hide-sm">{back.label}</span>
        </Link>
      ) : (
        <MenuButton />
      )}
      <h1 className="h1" style={{ flex: 1, minWidth: 0 }}>
        {title}
      </h1>
      <span className="muted sm hide-sm" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon name="calendar" size="sm" />
        {thaiDateLong(bangkokDate())}
      </span>
      <span className="userchip">
        <span className="avatar sm">{user.initials}</span>
        <span className="hide-sm">{user.shortName}</span>
      </span>
    </header>
  )
}
