export interface Topic {
  id: number
  name: string
  slug: string
}

export interface RecommendedTopic extends Topic {
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
