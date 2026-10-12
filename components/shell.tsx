'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { toggleTheme } from '@/app/(app)/actions'
import { logout } from '@/app/login/actions'
import { Icon, type IconName } from './icons'

type ShellUser = { name: string; initials: string; role: string }

const ROLE_LABEL: Record<string, string> = { pharmacist: 'เภสัชกร', admin: 'ผู้ดูแลระบบ' }

const NAV: { group: string; items: { href: string; label: string; icon: IconName }[] }[] = [
  {
    group: 'เมนูหลัก',
    items: [
      { href: '/', label: 'ค้นหาผู้ป่วย', icon: 'search' },
      { href: '/kpi', label: 'ตัวชี้วัด', icon: 'kpi' },
    ],
  },
  {
    group: 'ข้อมูล',
    items: [
      { href: '/data', label: 'ข้อมูลและประวัติ', icon: 'data' },
      { href: '/guide', label: 'ขั้นตอนงาน', icon: 'guide' },
    ],
  },
]

const DrawerContext = createContext<() => void>(() => {})

// Hamburger shown in the page header under 900px (see .menu-btn in theme.css).
export function MenuButton() {
  const open = useContext(DrawerContext)
  return (
    <button type="button" className="btn btn-ic menu-btn" aria-label="เปิดเมนู" onClick={open}>
      <Icon name="menu" />
    </button>
  )
}

export function Shell({ user, theme, children }: { user: ShellUser; theme: 'light' | 'dark'; children: React.ReactNode }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [openedOn, setOpenedOn] = useState(pathname)
  const side = useRef<HTMLElement>(null)

  // Navigating closes the drawer.
  if (open && openedOn !== pathname) setOpen(false)

  useEffect(() => {
    if (!open) return
    side.current?.querySelector<HTMLElement>('a, button')?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const isOn = (href: string) => (href === '/' ? pathname === '/' || pathname.startsWith('/patients') : pathname.startsWith(href))

  return (
    <DrawerContext.Provider
      value={() => {
        setOpenedOn(pathname)
        setOpen(true)
      }}
    >
      <div className={`${theme === 'dark' ? 'pc dark' : 'pc'} shell${open ? ' open' : ''}`}>
        <aside className="side" ref={side} aria-label="เมนู">
          <div className="brand">
            <Image
              src="/logo-utth.png"
              alt="โลโก้โรงพยาบาลอุตรดิตถ์"
              width={46}
              height={46}
              style={{ flex: 'none', objectFit: 'contain', background: '#ffffff', borderRadius: '50%', padding: 1 }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
              <span className="brand-t">PharmCare OPD</span>
              <span className="brand-s">งานบริบาลเภสัชกรรม</span>
            </div>
            <button type="button" className="btn btn-ic menu-btn" aria-label="ปิดเมนู" onClick={() => setOpen(false)}>
              <Icon name="close" />
            </button>
          </div>
          <nav aria-label="เมนูหลัก" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {NAV.map((g) => (
              <div key={g.group} style={{ display: 'contents' }}>
                <div className="grp">{g.group}</div>
                {g.items.map((it) => (
                  <Link key={it.href} href={it.href} className={`nav${isOn(it.href) ? ' on' : ''}`} aria-current={isOn(it.href) ? 'page' : undefined}>
                    <Icon name={it.icon} />
                    {it.label}
                  </Link>
                ))}
              </div>
            ))}
          </nav>
          <div style={{ flex: 1 }} />
          <form action={toggleTheme}>
            <button type="submit" className="nav">
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
              {theme === 'dark' ? 'ธีมสว่าง' : 'ธีมมืด'}
            </button>
          </form>
          <div className="usercard">
            <span className="avatar">{user.initials}</span>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{user.name}</span>
              <span className="muted xs">{ROLE_LABEL[user.role] ?? user.role}</span>
            </div>
          </div>
          <form action={logout}>
            <button type="submit" className="btn btn-out-dan" style={{ width: '100%', marginTop: 8 }}>
              <Icon name="logout" size="sm" />
              ออกจากระบบ
            </button>
          </form>
        </aside>
        {open && <button type="button" className="scrim" aria-label="ปิดเมนู" onClick={() => setOpen(false)} />}
        <main className="shell-main">{children}</main>
      </div>
    </DrawerContext.Provider>
  )
}
