export interface LibraryItem {
  id: string;
  title: string;
  posterPath: string;
  playlistPath: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaveItemRequest {
  id?: string;
  title: string;
  posterPath: string;
  playlistPath: string;
}

export interface SaveItemResponse {
  success: boolean;
  data: LibraryItem[];
}