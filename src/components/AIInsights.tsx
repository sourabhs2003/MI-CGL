import { motion } from 'framer-motion'
import { Sparkles, AlertTriangle, TrendingUp, Target } from 'lucide-react'

interface Insight {
  type: 'warning' | 'opportunity' | 'goal'
  message: string
}

interface AIInsightsProps {
  insights: Insight[]
}

export function AIInsights({ insights }: AIInsightsProps) {
  const getIcon = (type: Insight['type']) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle size={16} />
      case 'opportunity':
        return <TrendingUp size={16} />
      case 'goal':
        return <Target size={16} />
      default:
        return <Sparkles size={16} />
    }
  }

  return (
    <div className="ai-insights-section">
      <div className="ai-insights-header">
        <Sparkles size={18} />
        <h3>AI Insights</h3>
      </div>

      <div className="ai-insights-list">
        {insights.map((insight, index) => (
          <motion.div
            key={index}
            className={`ai-insight-card ai-insight-${insight.type}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <div className="ai-insight-icon">
              {getIcon(insight.type)}
            </div>
            <p className="ai-insight-message">{insight.message}</p>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
