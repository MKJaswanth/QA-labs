/**
 * Shared chart components for Reports and Run Detail pages.
 */

// SVG donut ring for pass rate
export function PassRing({ rate, size = 140 }) {
  const r = (size / 2) - 8
  const circ = 2 * Math.PI * r
  const dash = (rate / 100) * circ
  const strokeColor = rate >= 70 ? 'var(--success)' : rate >= 50 ? 'var(--warning)' : 'var(--danger)'
  return (
    <div className="pass-ring-wrap" style={{ width: size, height: size }} role="img" aria-label={`Pass rate ${rate}%`}>
      <svg viewBox={`0 0 ${size} ${size}`} className="pass-ring-svg" style={{ width: size, height: size }} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} className="ring-track" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          className="ring-fill"
          stroke={strokeColor}
          strokeDasharray={`${dash} ${circ}`}
          strokeDashoffset={circ / 4}
        />
      </svg>
      <div className="pass-ring-label" aria-hidden="true">
        <strong>{rate}%</strong>
        <span>pass rate</span>
      </div>
    </div>
  )
}

// Horizontal bar with % label
export function Bar({ label, value, total, tone }) {
  const pct = total ? Math.round((value / total) * 100) : 0
  return (
    <div className="chart-bar-row" role="img" aria-label={`${label}: ${value} of ${total || 0}, ${pct}%`}>
      <span className="chart-bar-label">{label}</span>
      <div className="chart-bar-track" aria-hidden="true">
        <div className={`chart-bar-fill chart-bar--${tone}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="chart-bar-value">{value} <em>{pct}%</em></span>
    </div>
  )
}

// SVG polyline sparkline for run pass-rate trend
export function RunTrend({ runs }) {
  if (!runs || runs.length < 2) return null
  const rates = runs.map((r) => (r.total ? Math.round((r.passed / r.total) * 100) : 0))
  const W = 180, H = 52, pad = 6
  const xStep = runs.length > 1 ? (W - pad * 2) / (runs.length - 1) : 0
  const yScale = (v) => pad + (H - pad * 2) * (1 - v / 100)
  const pts = rates.map((v, i) => [pad + i * xStep, yScale(v)])
  const polyline = pts.map(([x, y]) => `${x},${y}`).join(' ')
  const latest = rates[rates.length - 1]
  const prev = rates[rates.length - 2]
  const delta = latest - prev
  const color = latest >= 70 ? 'var(--success)' : latest >= 50 ? 'var(--warning)' : 'var(--danger)'
  const deltaColor = delta > 0 ? 'var(--success)' : delta < 0 ? 'var(--danger)' : 'var(--text-muted)'

  return (
    <div className="run-trend-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="run-trend-svg" aria-hidden>
        <polyline points={polyline} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={i === pts.length - 1 ? 4 : 2.5} fill={color} />
        ))}
      </svg>
      <div className="run-trend-meta">
        <span className="run-trend-latest" style={{ color }}>{latest}%</span>
        {delta !== 0 && (
          <span className="run-trend-delta" style={{ color: deltaColor }}>
            {delta > 0 ? '↑' : '↓'}{Math.abs(delta)}%
          </span>
        )}
        <span className="run-trend-label">{runs.length} runs</span>
      </div>
    </div>
  )
}

// Full-width SVG line chart of pass rate over time — smooth bezier, gradient fill
export function TrendLineChart({ runs }) {
  if (!runs || runs.length < 2) {
    return (
      <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
        Need at least 2 completed runs to show a trend.
      </div>
    )
  }

  const sorted = [...runs].sort((a, b) => new Date(a.completedAt || a.date || 0) - new Date(b.completedAt || b.date || 0))
  const points = sorted.map((r) => ({
    rate: r.total ? Math.round((r.passed / r.total) * 100) : 0,
    label: r.name || new Date(r.completedAt || r.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
  }))

  const W = 800, H = 240, padL = 44, padR = 20, padTop = 20, padBot = 44
  const innerW = W - padL - padR
  const innerH = H - padTop - padBot
  const n = points.length
  const xOf = (i) => padL + (n > 1 ? (i / (n - 1)) * innerW : innerW / 2)
  const yOf = (v) => padTop + innerH * (1 - v / 100)
  const pts = points.map((p, i) => [xOf(i), yOf(p.rate)])

  // Smooth cubic bezier path
  const curvePath = pts.reduce((acc, [x, y], i) => {
    if (i === 0) return `M ${x},${y}`
    const [px, py] = pts[i - 1]
    const cpx = (px + x) / 2
    return `${acc} C ${cpx},${py} ${cpx},${y} ${x},${y}`
  }, '')

  // Closed area path for gradient fill
  const areaPath = `${curvePath} L ${pts[n - 1][0]},${padTop + innerH} L ${pts[0][0]},${padTop + innerH} Z`

  const latest = points[n - 1].rate
  const first = points[0].rate
  const highest = Math.max(...points.map((p) => p.rate))
  const lowest = Math.min(...points.map((p) => p.rate))
  const netDelta = latest - first

  const lineColor = latest >= 70 ? 'var(--success)' : latest >= 50 ? 'var(--warning)' : 'var(--danger)'
  const gradId = 'tcg'
  const gridLines = [0, 25, 50, 75, 100]

  // Skip x-labels when too crowded
  const maxLabels = 10
  const labelStep = n > maxLabels ? Math.ceil(n / maxLabels) : 1

  return (
    <div className="trend-chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="trend-chart-svg" aria-label="Pass rate trend">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.18" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {gridLines.map((v) => (
          <g key={v}>
            <line
              x1={padL} y1={yOf(v)} x2={W - padR} y2={yOf(v)}
              stroke={v === 0 ? 'var(--border)' : 'var(--border)'}
              strokeWidth={v === 0 ? 1 : 0.75}
              strokeDasharray={v === 0 || v === 100 ? 'none' : '5 5'}
              opacity={v === 0 ? 1 : 0.6}
            />
            <text x={padL - 8} y={yOf(v) + 4} textAnchor="end" fontSize="10" fill="var(--text-muted)" fontFamily="inherit">
              {v}%
            </text>
          </g>
        ))}

        {/* Gradient area */}
        <path d={areaPath} fill={`url(#${gradId})`} />

        {/* Smooth line */}
        <path d={curvePath} fill="none" stroke={lineColor} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

        {/* Dots */}
        {pts.map(([x, y], i) => (
          <g key={i} className="trend-dot-group">
            <circle cx={x} cy={y} r="6" fill="transparent" />
            <circle cx={x} cy={y} r="4" fill={lineColor} stroke="#fff" strokeWidth="2" />
            <title>{points[i].label}: {points[i].rate}%</title>
          </g>
        ))}

        {/* X-axis labels */}
        {points.map((p, i) => {
          if (i !== 0 && i !== n - 1 && i % labelStep !== 0) return null
          return (
            <text
              key={i}
              x={pts[i][0]} y={H - 6}
              textAnchor="middle" fontSize="10" fill="var(--text-muted)" fontFamily="inherit"
            >
              {p.label.length > 12 ? p.label.slice(0, 11) + '…' : p.label}
            </text>
          )
        })}
      </svg>

      {/* Summary stats */}
      <div className="trend-chart-stats">
        <div className="trend-stat">
          <span className="trend-stat-label">Latest</span>
          <strong className="trend-stat-value" style={{ color: lineColor }}>{latest}%</strong>
        </div>
        <div className="trend-stat-divider" />
        <div className="trend-stat">
          <span className="trend-stat-label">Change</span>
          <strong className="trend-stat-value" style={{ color: netDelta > 0 ? 'var(--success)' : netDelta < 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
            {netDelta > 0 ? '↑' : netDelta < 0 ? '↓' : '—'}{netDelta !== 0 ? Math.abs(netDelta) + '%' : ''}
          </strong>
        </div>
        <div className="trend-stat-divider" />
        <div className="trend-stat">
          <span className="trend-stat-label">Best</span>
          <strong className="trend-stat-value" style={{ color: 'var(--success)' }}>{highest}%</strong>
        </div>
        <div className="trend-stat-divider" />
        <div className="trend-stat">
          <span className="trend-stat-label">Lowest</span>
          <strong className="trend-stat-value" style={{ color: 'var(--danger)' }}>{lowest}%</strong>
        </div>
        <div className="trend-stat-divider" />
        <div className="trend-stat">
          <span className="trend-stat-label">Runs</span>
          <strong className="trend-stat-value">{n}</strong>
        </div>
      </div>
    </div>
  )
}
