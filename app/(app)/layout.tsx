import { Shell } from '@/components/shell'
import { requireUser } from '@/lib/auth/dal'
import { getTheme } from '@/lib/theme'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, theme] = await Promise.all([requireUser(), getTheme()])
  return (
    <Shell user={{ name: user.name, initials: user.initials, role: user.role }} theme={theme}>
      {children}
    </Shell>
  )
}
