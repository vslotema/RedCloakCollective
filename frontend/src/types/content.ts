

export interface Creator {
  id: string | number;
  name: string;
  avatar: string;
}

export interface Image {
  id: string | number;
  url: string;
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
  preview_images: Image[];
  saves: number;
  items_count: number;
  /** True when the whole list is newly published. */
  is_new?: boolean;
  /** Number of items added since the list was first published. Set when the list already existed and grew. */
  num_new_items?: number;
}

export type ContentItem = Article | EquipmentList;
