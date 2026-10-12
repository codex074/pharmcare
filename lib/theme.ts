import { cookies } from 'next/headers'

export const THEME_COOKIE = 'pc_theme'
export type Theme = 'light' | 'dark'

export async function getTheme(): Promise<Theme> {
  return (await cookies()).get(THEME_COOKIE)?.value === 'dark' ? 'dark' : 'light'
}

// Class list for the `.pc` root.
export const pcClass = (theme: Theme) => (theme === 'dark' ? 'pc dark' : 'pc')
