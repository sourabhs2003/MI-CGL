type HeatmapItem = {
  dayKey: string
  value: number
}

type Props = {
  data: HeatmapItem[]
  mode?: 'study' | 'mock'
  compact?: boolean
}

function getIntensity(value: number) {
  if (value >= 3) return 4
  if (value >= 2) return 3
  if (value >= 1) return 2
  if (value > 0) return 1
  return 0
}

export function ActivityHeatmap({ data, mode = 'study', compact = false }: Props) {
  return (
    <div className={compact ? 'activity-heatmap compact' : 'activity-heatmap'} aria-label={`${mode} heatmap`}>
      {data.map((item) => (
        <div
          key={item.dayKey}
          className={`heatmap-cell intensity-${getIntensity(item.value)} ${mode}`}
          title={`${item.dayKey}: ${item.value}${mode === 'mock' ? ' mock' : 'h'}`}
        />
      ))}
    </div>
  )
}
