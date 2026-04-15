interface AICoachInput {
  todayStudyTime: number // in seconds
  streak: number
  rank: string
  leaderboardPosition: number
}

export async function generateAICoachMessage(input: AICoachInput): Promise<string> {
  const { todayStudyTime, streak, rank, leaderboardPosition } = input

  // For now, return rule-based messages instead of calling AI API
  // This avoids API key exposure and rate limiting issues
  const studyMinutes = Math.round(todayStudyTime / 60)
  
  const messages: string[] = []

  // Study time based messages
  if (studyMinutes === 0) {
    messages.push("You're falling behind. Push 1 hour now.")
    messages.push("No study today? Start now to build momentum.")
    messages.push("Every minute counts. Begin your session.")
  } else if (studyMinutes < 30) {
    messages.push("Good start, but push for 1 hour minimum.")
    messages.push("You're building momentum. Add 30 more minutes.")
    messages.push("Small progress is still progress. Keep going!")
  } else if (studyMinutes < 60) {
    messages.push("Great work! Push for that full hour.")
    messages.push("You're on track. Finish strong today.")
    messages.push("Consistency beats talent. Stay at it.")
  } else if (studyMinutes < 120) {
    messages.push("Excellent work! You're dominating today.")
    messages.push("2+ hours - you're unstoppable!")
    messages.push("Great consistency. Keep this momentum.")
  } else {
    messages.push("Incredible! You're crushing it today.")
    messages.push("Top-tier performance. Keep dominating.")
    messages.push("You're setting the pace for everyone else.")
  }

  // Streak based messages
  if (streak === 0) {
    messages.push("Start your streak today. Don't wait.")
    messages.push("Zero streak? Today's the day to change that.")
  } else if (streak <= 3) {
    messages.push("Good start. Don't break the streak.")
    messages.push("Building momentum. Keep the streak alive.")
  } else if (streak <= 7) {
    messages.push("Momentum building! You're on fire.")
    messages.push("Week-long streak. You're unstoppable.")
  } else {
    messages.push(`${streak} day streak! You're a machine.`)
    messages.push("Unstoppable consistency. Legend status.")
  }

  // Rank based messages
  if (rank === 'Bronze') {
    messages.push("Bronze tier? Time to level up to Silver.")
    messages.push("Push harder to reach Silver rank.")
  } else if (rank === 'Silver') {
    messages.push("Silver is good, but Gold is better.")
    messages.push("You're close to Gold. Go for it!")
  } else if (rank === 'Gold') {
    messages.push("Gold tier - now aim for Platinum.")
    messages.push("Elite status. Keep pushing higher.")
  } else if (rank === 'Platinum') {
    messages.push("Platinum! Almost at the top.")
    messages.push("Elite player. Reach for Topper.")
  } else {
    messages.push("Topper rank! You're the champion.")
    messages.push("At the peak. Maintain your dominance.")
  }

  // Leaderboard based messages
  if (leaderboardPosition <= 3) {
    messages.push("Top 3! You're dominating the leaderboard.")
    messages.push("Elite position. Hold your spot.")
  } else if (leaderboardPosition <= 5) {
    messages.push("Top 5! Push to break into top 3.")
    messages.push("You're close to the elite tier.")
  } else if (leaderboardPosition <= 10) {
    messages.push("Top 10! Great position.")
    messages.push("Climbing the ranks. Keep going.")
  } else {
    messages.push(`Position #${leaderboardPosition}. Time to climb.`)
    messages.push("Push harder to move up the leaderboard.")
  }

  // Random selection from relevant messages
  const relevantMessages = messages.filter(() => Math.random() > 0.3)
  return relevantMessages[Math.floor(Math.random() * relevantMessages.length)] || messages[0]
}
