import { thaiMonthYear } from '@/lib/thai-date'

// Line chart with the target zone shaded, after board 04. Server-rendered SVG;
// labels every point because there are rarely more than a handful.
export function TrendChart({ points, goal, unit, label }: { points: { date: string; value: number }[]; goal: number; unit: string; label: string }) {
  const W = 640
  const H = 250
  const L = 48
  const R = 624
  const T = 20
  const B = 200
  const values = points.map((p) => p.value).concat(goal)
  const lo = Math.floor(Math.min(...values) - 0.5)
  const hi = Math.ceil(Math.max(...values) + 0.5)
  const y = (v: number) => B - ((v - lo) / (hi - lo || 1)) * (B - T)
  const n = points.length
  const x = (i: number) => (n === 1 ? (L + R) / 2 : L + 32 + (i * (R - L - 56)) / (n - 1))
  const step = Math.max(1, Math.ceil((hi - lo) / 4))
  const ticks: number[] = []
  for (let v = lo; v <= hi; v += step) ticks.push(v)
  const desc = `${label}: ${points.map((p) => `${thaiMonthYear(p.date)} ${p.value}${unit}`).join(', ')} เป้าหมายต่ำกว่า ${goal}${unit}`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={desc} style={{ width: '100%', height: 'auto', display: 'block', fontFamily: 'inherit' }}>
      <rect x={L} y={y(goal)} width={R - L} height={B - y(goal)} style={{ fill: 'var(--ok-bg)' }} />
      <line x1={L} y1={y(goal)} x2={R} y2={y(goal)} style={{ stroke: 'var(--ok)', strokeWidth: 1.5, strokeDasharray: '5 4' }} />
      {ticks.map((v) => (
        <g key={v}>
          <line x1={L} y1={y(v)} x2={R} y2={y(v)} style={{ stroke: v === lo ? 'var(--line)' : 'var(--line2)' }} />
          <text x={L - 10} y={y(v) + 4} textAnchor="end" style={{ fill: 'var(--tx2)', fontSize: 12 }}>
            {v}
          </text>
        </g>
      ))}
      <polyline
        points={points.map((p, i) => `${x(i)},${y(p.value)}`).join(' ')}
        style={{ fill: 'none', stroke: 'var(--pri)', strokeWidth: 2.5, strokeLinejoin: 'round', strokeLinecap: 'round' }}
      />
      {points.map((p, i) => {
        const last = i === n - 1
        return (
          <g key={`${p.date}-${i}`}>
            <circle cx={x(i)} cy={y(p.value)} r={last ? 6 : 5} style={last ? { fill: 'var(--pri)', stroke: 'var(--card)', strokeWidth: 2.5 } : { fill: 'var(--card)', stroke: 'var(--pri)', strokeWidth: 2.5 }} />
            <text x={x(i)} y={y(p.value) - 14} textAnchor="middle" style={{ fill: last ? 'var(--pri-tx)' : 'var(--tx)', fontSize: last ? 14 : 13, fontWeight: last ? 700 : 600 }}>
              {p.value}
            </text>
            <text x={x(i)} y={226} textAnchor="middle" style={{ fill: last ? 'var(--tx)' : 'var(--tx2)', fontSize: 12, fontWeight: last ? 600 : 400 }}>
              {thaiMonthYear(p.date)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
