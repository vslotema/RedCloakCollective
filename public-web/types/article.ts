import type { JSONContent } from '@tiptap/core'

export interface ArticleAuthor {
  id: number
  name: string
  username: string
}

export interface HeaderImagePosition {
  x: number
  y: number
}

/** Full article as returned by `GET /api/me/articles/{id}` (the editor's load endpoint). */
export interface Article {
  id: number
  title: string
  slug: string
  content: JSONContent
  header_image_url: string | null
  header_image_position: HeaderImagePosition | null
  published: boolean
  published_at: string | null
  created_at: string
  updated_at: string
  author: ArticleAuthor
}

/** Row shape from `GET /api/me/articles` (list). */
export type ArticleSummary = Omit<Article, 'content' | 'author' | 'header_image_position'>
