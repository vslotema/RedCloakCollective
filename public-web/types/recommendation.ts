export interface RecommendedTopic {
  id: number
  name: string
  slug: string
  following: boolean
}

export interface RecommendedPerson {
  id: number
  name: string
  username: string
  articles_count: number
  followers_count: number
}

export interface FeedRecommendations {
  topics: RecommendedTopic[]
  people: RecommendedPerson[]
}
