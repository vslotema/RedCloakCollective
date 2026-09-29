export const TOPIC_COLORS = ['#8B5CF6', '#F59E0B', '#F97316', '#10B981', '#3B82F6'] as const

export function topicColorAt(index: number): string {
  return TOPIC_COLORS[index % TOPIC_COLORS.length] ?? TOPIC_COLORS[0]
}
