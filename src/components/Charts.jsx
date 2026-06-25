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

// Full-width SVG line chart of pass rate over time — for reports and public report page
export function TrendLineChart({ runs }) {
  if (!runs || runs.length < 2) {
    return <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '8px 0' }}>Not enough runs yet to show a trend. Need at least 2 completed runs.</p>
  }

  const sorted = [...runs].sort((a, b) => new Date(a.completedAt || a.date || 0) - new Date(b.completedAt || b.date || 0))
  const points = sorted.map((r) => ({
    rate: r.total ? Math.round((r.passed / r.total) * 100) : 0,
    label: r.name || new Date(r.completedAt || r.date).toLocaleDateString(),
    date: r.completedAt || r.date,
  }))

  const W = 600, H = 200, padX = 40, padY = 20
  const innerW = W - padX * 2
  const innerH = H - padY * 2
  const xStep = points.length > 1 ? innerW / (points.length - 1) : 0
  const yScale = (v) => padY + innerH * (1 - v / 100)
  const pts = points.map((p, i) => [padX + i * xStep, yScale(p.rate)])
  const polyline = pts.map(([x, y]) => `${x},${y}`).join(' ')
  const area = `${pts.map(([x, y]) => `${x},${y}`).join(' ')} ${padX + (points.length - 1) * xStep},${padY + innerH} ${padX},${padY + innerH}`

  // Y-axis grid lines at 0, 25, 50, 75, 100
  const gridLines = [0, 25, 50, 75, 100]

  const latest = points[points.length - 1].rate
  const first = points[0].rate
  const netDelta = latest - first
  const lineColor = latest >= 70 ? '#10b981' : latest >= 50 ? '#f59e0b' : '#ef4444'

  return (
    <div className="trend-chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="trend-chart-svg" aria-label="Pass rate trend over runs">
        {/* Grid */}
        {gridLines.map((v) => (
          <g key={v}>
            <line x1={padX} y1={yScale(v)} x2={W - padX} y2={yScale(v)} stroke="var(--border)" strokeWidth="1" strokeDasharray={v === 0 || v === 100 ? 'none' : '4 4'} />
            <text x={padX - 6} y={yScale(v) + 4} textAnchor="end" fontSize="10" fill="var(--text-muted)">{v}%</text>
          </g>
        ))}
        {/* Area fill */}
        <polygon points={area} fill={lineColor} fillOpacity="0.08" />
        {/* Line */}
        <polyline points={polyline} fill="none" stroke={lineColor} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {/* Points + tooltips */}
        {pts.map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="5" fill={lineColor} stroke="#fff" strokeWidth="2" />
            <title>{points[i].label}: {points[i].rate}%</title>
          </g>
        ))}
        {/* X labels — show up to 8, skip middle ones if too many */}
        {points.map((p, i) => {
          const skip = points.length > 8 && i > 0 && i < points.length - 1 && i % Math.ceil(points.length / 6) !== 0
          if (skip) return null
          return (
            <text key={i} x={pts[i][0]} y={H - 4} textAnchor="middle" fontSize="9" fill="var(--text-muted)">
              {p.label.length > 10 ? p.label.slice(0, 10) + '…' : p.label}
            </text>
          )
        })}
      </svg>
      <div className="trend-chart-legend">
        <span style={{ color: lineColor, fontWeight: 700, fontSize: '20px' }}>{latest}%</span>
        <span style={{ color: netDelta >= 0 ? '#10b981' : '#ef4444', fontSize: '13px' }}>
          {netDelta >= 0 ? '↑' : '↓'}{Math.abs(netDelta)}% since first run
        </span>
        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{points.length} runs tracked</span>
      </div>
    </div>
  )
}
