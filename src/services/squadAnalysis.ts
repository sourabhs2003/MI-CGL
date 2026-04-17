type SquadMember = {
  uid: string
  username: string
  xp: number
  streak: number
  weekHours: number
  mockCount: number
}

type AnalysisResult = {
  strongest: string
  weakest: string
  suggestion: string
  summary: string
}

export function analyzeSquad(members: SquadMember[]): AnalysisResult {
  if (members.length === 0) {
    return {
      strongest: 'N/A',
      weakest: 'N/A',
      suggestion: 'No squad data available',
      summary: 'Add members to see squad analysis',
    }
  }

  // Find strongest by XP and consistency
  const strongest = members.reduce((max, member) => {
    const score = member.xp + (member.streak * 10) + (member.weekHours * 5)
    const maxScore = max.xp + (max.streak * 10) + (max.weekHours * 5)
    return score > maxScore ? member : max
  })

  // Find weakest by XP and consistency
  const weakest = members.reduce((min, member) => {
    const score = member.xp + (member.streak * 10) + (member.weekHours * 5)
    const minScore = min.xp + (min.streak * 10) + (min.weekHours * 5)
    return score < minScore ? member : min
  })

  // Generate suggestion based on data
  const avgStreak = members.reduce((sum, m) => sum + m.streak, 0) / members.length
  const avgHours = members.reduce((sum, m) => sum + m.weekHours, 0) / members.length

  let suggestion = ''
  if (avgStreak < 3) {
    suggestion = 'Team needs to maintain daily consistency. Focus on building streaks.'
  } else if (avgHours < 5) {
    suggestion = 'Increase study hours to boost squad performance.'
  } else if (strongest.weekHours - weakest.weekHours > 5) {
    suggestion = `${weakest.username} needs to catch up. Team should support weaker members.`
  } else {
    suggestion = 'Squad performing well. Keep pushing for consistency.'
  }

  const summary = `${strongest.username} leads in consistency. ${weakest.username} needs support. ${suggestion}`

  return {
    strongest: strongest.username,
    weakest: weakest.username,
    suggestion,
    summary,
  }
}
