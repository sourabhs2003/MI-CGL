export type AnalysisTrendPoint = {
  id: string
  label: string
  score: number
  accuracy: number
  attempted: number
  total: number
  attemptRate: number
}

export type SectionChartPoint = {
  name: string
  score: number
  accuracy: number
}

type ChartPoint = {
  label: string
  value: number
}

type DualChartPoint = {
  label: string
  bar: number
  line: number
}

function EmptyChart({ label }: { label: string }) {
  return <div className="analysis-empty-chart">{label}</div>
}

function shortLabel(label: string, max = 8) {
  return label.length > max ? `${label.slice(0, max - 1)}.` : label
}

function getTicks(max: number) {
  return [0, Math.round(max / 2), max]
}

function LineSvgChart({
  data,
  color,
  label,
  maxValue,
}: {
  data: ChartPoint[]
  color: string
  label: string
  maxValue?: number
}) {
  const width = 340
  const height = 230
  const pad = { top: 16, right: 16, bottom: 34, left: 38 }
  const chartWidth = width - pad.left - pad.right
  const chartHeight = height - pad.top - pad.bottom
  const yMax = Math.max(maxValue ?? Math.ceil(Math.max(...data.map((item) => item.value), 1) * 1.12), 1)
  const points = data.map((item, index) => {
    const x = pad.left + (index / Math.max(data.length - 1, 1)) * chartWidth
    const y = pad.top + chartHeight - (item.value / yMax) * chartHeight
    return { ...item, x, y }
  })
  const path = points.map((point) => `${point.x},${point.y}`).join(' ')
  const labelStep = Math.max(1, Math.ceil(data.length / 6))

  return (
    <svg className="analysis-svg-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
      {getTicks(yMax).map((tick) => {
        const y = pad.top + chartHeight - (tick / yMax) * chartHeight
        return (
          <g key={tick}>
            <line x1={pad.left} x2={width - pad.right} y1={y} y2={y} stroke="rgba(148, 163, 184, 0.16)" strokeDasharray="3 6" />
            <text x={pad.left - 8} y={y + 4} textAnchor="end" fill="#94a3b8" fontSize="10" fontWeight="700">
              {tick}
            </text>
          </g>
        )
      })}
      <polyline points={path} fill="none" stroke={color} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((point, index) => (
        <g key={`${point.label}-${index}`}>
          <circle cx={point.x} cy={point.y} r={point.value > 0 ? 3.6 : 2.4} fill={color} />
          {point.value > 0 && (
            <text x={point.x} y={Math.max(10, point.y - 8)} textAnchor="middle" fill="#f8fafc" fontSize="9" fontWeight="850">
              {point.value.toFixed(0)}
            </text>
          )}
          {index % labelStep === 0 && (
            <text x={point.x} y={height - 10} textAnchor="middle" fill="#cbd5e1" fontSize="9" fontWeight="750">
              {shortLabel(point.label, 6)}
            </text>
          )}
        </g>
      ))}
    </svg>
  )
}

function BarSvgChart({
  data,
  color,
  label,
  maxValue = 100,
}: {
  data: ChartPoint[]
  color: string
  label: string
  maxValue?: number
}) {
  const width = 340
  const height = 230
  const pad = { top: 16, right: 16, bottom: 38, left: 38 }
  const chartWidth = width - pad.left - pad.right
  const chartHeight = height - pad.top - pad.bottom
  const yMax = Math.max(maxValue, Math.ceil(Math.max(...data.map((item) => item.value), 1) * 1.12))
  const gap = data.length > 5 ? 6 : 12
  const barWidth = Math.max(10, (chartWidth - gap * (data.length - 1)) / data.length)

  return (
    <svg className="analysis-svg-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
      {getTicks(yMax).map((tick) => {
        const y = pad.top + chartHeight - (tick / yMax) * chartHeight
        return (
          <g key={tick}>
            <line x1={pad.left} x2={width - pad.right} y1={y} y2={y} stroke="rgba(148, 163, 184, 0.16)" strokeDasharray="3 6" />
            <text x={pad.left - 8} y={y + 4} textAnchor="end" fill="#94a3b8" fontSize="10" fontWeight="700">
              {tick}
            </text>
          </g>
        )
      })}
      {data.map((item, index) => {
        const x = pad.left + index * (barWidth + gap)
        const barHeight = Math.max(item.value > 0 ? 3 : 0, (item.value / yMax) * chartHeight)
        const y = pad.top + chartHeight - barHeight
        return (
          <g key={`${item.label}-${index}`}>
            <rect x={x} y={y} width={barWidth} height={barHeight} rx="6" fill={color} />
            {item.value > 0 && (
              <text x={x + barWidth / 2} y={Math.max(10, y - 7)} textAnchor="middle" fill="#f8fafc" fontSize="9" fontWeight="850">
                {item.value.toFixed(0)}
              </text>
            )}
            <text x={x + barWidth / 2} y={height - 12} textAnchor="middle" fill="#cbd5e1" fontSize="9" fontWeight="750">
              {shortLabel(item.label)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function AttemptAccuracySvgChart({ data }: { data: DualChartPoint[] }) {
  const width = 340
  const height = 230
  const pad = { top: 16, right: 16, bottom: 38, left: 38 }
  const chartWidth = width - pad.left - pad.right
  const chartHeight = height - pad.top - pad.bottom
  const yMax = 100
  const gap = data.length > 5 ? 6 : 12
  const barWidth = Math.max(10, (chartWidth - gap * (data.length - 1)) / data.length)
  const linePoints = data.map((item, index) => {
    const x = pad.left + index * (barWidth + gap) + barWidth / 2
    const y = pad.top + chartHeight - (item.line / yMax) * chartHeight
    return { ...item, x, y }
  })

  return (
    <svg className="analysis-svg-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Attempt rate and accuracy">
      {getTicks(yMax).map((tick) => {
        const y = pad.top + chartHeight - (tick / yMax) * chartHeight
        return (
          <g key={tick}>
            <line x1={pad.left} x2={width - pad.right} y1={y} y2={y} stroke="rgba(148, 163, 184, 0.16)" strokeDasharray="3 6" />
            <text x={pad.left - 8} y={y + 4} textAnchor="end" fill="#94a3b8" fontSize="10" fontWeight="700">
              {tick}
            </text>
          </g>
        )
      })}
      {data.map((item, index) => {
        const x = pad.left + index * (barWidth + gap)
        const barHeight = Math.max(item.bar > 0 ? 3 : 0, (item.bar / yMax) * chartHeight)
        const y = pad.top + chartHeight - barHeight
        return (
          <g key={`${item.label}-${index}`}>
            <rect x={x} y={y} width={barWidth} height={barHeight} rx="6" fill="#f59e0b" opacity="0.82" />
            <text x={x + barWidth / 2} y={height - 12} textAnchor="middle" fill="#cbd5e1" fontSize="9" fontWeight="750">
              {shortLabel(item.label, 6)}
            </text>
          </g>
        )
      })}
      <polyline
        points={linePoints.map((point) => `${point.x},${point.y}`).join(' ')}
        fill="none"
        stroke="#38bdf8"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {linePoints.map((point, index) => (
        <circle key={`${point.label}-${index}`} cx={point.x} cy={point.y} r="3.4" fill="#38bdf8" />
      ))}
    </svg>
  )
}

export function ScoreTrendChart({ data }: { data: AnalysisTrendPoint[] }) {
  if (!data.length) return <EmptyChart label="No score trend yet" />
  return <LineSvgChart data={data.map((item) => ({ label: item.label, value: item.score }))} color="#22c55e" label="Score trend" maxValue={100} />
}

export function AccuracyTrendChart({ data }: { data: AnalysisTrendPoint[] }) {
  if (!data.length) return <EmptyChart label="No accuracy trend yet" />
  return <LineSvgChart data={data.map((item) => ({ label: item.label, value: item.accuracy }))} color="#38bdf8" label="Accuracy trend" maxValue={100} />
}

export function SectionPerformanceChart({ data }: { data: SectionChartPoint[] }) {
  if (!data.length) return <EmptyChart label="No section data yet" />
  return <BarSvgChart data={data.map((item) => ({ label: item.name, value: item.score }))} color="#22c55e" label="Section performance" />
}

export function AttemptAccuracyChart({ data }: { data: AnalysisTrendPoint[] }) {
  if (!data.length) return <EmptyChart label="No attempt data yet" />
  return <AttemptAccuracySvgChart data={data.map((item) => ({ label: item.label, bar: item.attemptRate, line: item.accuracy }))} />
}
