import { NextResponse } from 'next/server'
import { clients } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Used by the container healthcheck and by failover.sh on the VPS.
export async function GET() {
  try {
    const { sql, authSql } = clients()
    await Promise.all([sql`select 1`, authSql`select 1`])
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[health]', error)
    return NextResponse.json({ ok: false }, { status: 503 })
  }
}
