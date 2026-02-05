export interface LibraryItem {
  id: string;
  title: string;
  posterPath: string;
  playlistPath: string;
  categoryId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SaveItemRequest {
  id?: string;
  title: string;
  posterPath: string;
  playlistPath: string;
  categoryId?: string | null;
}

export interface SaveItemResponse {
  success: boolean;
  data: LibraryItem[];
}