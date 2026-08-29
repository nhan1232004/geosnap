// Type-safe block data payloads for each block type

export interface ParagraphData {
  text: string;
}

export interface HeadingData {
  text: string;
  level: 1 | 2 | 3;
}

export interface TodoData {
  text: string;
  checked: boolean;
}

export interface ListItemData {
  text: string;
}

export interface QuoteData {
  text: string;
}

export interface CalloutData {
  text: string;
  icon?: string;
}

export interface DividerData {
  // No data needed
}

export interface ImageData {
  assetId: string;
  url: string;
  caption?: string;
  width?: number;
  height?: number;
}

export interface GalleryData {
  assetIds: string[];
  layout: 'grid' | 'masonry' | 'carousel';
  columns?: number;
}

export interface MapData {
  centerLat: number;
  centerLng: number;
  zoom: number;
  markerAssetIds?: string[];
}

export interface ChildPageData {
  childPageId: string;
}

// Maps BlockType to its data shape
export type BlockDataMap = {
  paragraph: ParagraphData;
  heading_1: HeadingData;
  heading_2: HeadingData;
  heading_3: HeadingData;
  bulleted_list: ListItemData;
  numbered_list: ListItemData;
  todo: TodoData;
  quote: QuoteData;
  callout: CalloutData;
  divider: DividerData;
  image: ImageData;
  gallery: GalleryData;
  map: MapData;
  child_page: ChildPageData;
};
