export interface Creator {
  id: string | number;
  name: string;
}

export interface BaseContent {
  id: string | number;
  type: 'article' | 'equipment';
  title: string;
  subtitle: string;
  creator: Creator;
}

export interface Article extends BaseContent {
  type: 'article';
  preview_image: string;
  likes: number;
  read_duration: string | number;
}

export interface EquipmentList extends BaseContent {
  type: 'equipment';
  preview_images: string[];
  saves: number;
}

export type ContentItem = Article | EquipmentList;
