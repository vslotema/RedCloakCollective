export interface Creator {
  id: string | number;
  name: string;
  avatar: string;
}

export interface BaseContent {
  id: string | number;
  type: 'article' | 'equipment';
  title: string;
  subtitle: string;
  creator: Creator;
  published_at: string;
  tags: string[];
  responses_count: number;
}

export interface Article extends BaseContent {
  type: 'article';
  preview_image: string;
  likes: number;
}

export interface EquipmentList extends BaseContent {
  type: 'equipment';
  preview_images: string[];
  saves: number;
}

export type ContentItem = Article | EquipmentList;
