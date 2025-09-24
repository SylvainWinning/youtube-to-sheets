export interface VideoData {
  channelAvatar?: string; // Colonne A
  title: string; // Colonne B
  link: string; // Colonne C
  channel: string; // Colonne D
  publishedAt: string; // Colonne E
  duration: string; // Colonne F
  views: string; // Colonne G
  likes: string; // Colonne H
  comments: string; // Colonne I
  shortDescription: string; // Colonne J
  tags: string; // Colonne K
  category?: string; // Colonne L (YouTube numeric category)
  thumbnail: string; // Colonne M
  myCategory?: string; // Colonne N (custom category)
  /**
   * Position de la vidéo dans la playlist YouTube d’origine.
   *
   * Elle est utilisée pour rétablir l’ordre exact de la playlist quand
   * l’utilisateur sélectionne « Playlist d’origine » dans le tri.
   */
  playlistPosition?: number;
}

export interface VideoResponse {
  data: VideoData[];
  error?: string;
  metadata?: {
    errors?: string[];
    timestamp: number;
  };
}
