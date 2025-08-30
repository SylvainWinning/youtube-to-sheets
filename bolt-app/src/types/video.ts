export interface VideoData {
  channelAvatar?: string;  // Colonne A
  title: string;          // Colonne B
  link: string;           // Colonne C
  channel: string;        // Colonne D
  publishedAt: string;    // Colonne E
  duration: string;       // Colonne F
  views: string;          // Colonne G
  likes: string;          // Colonne H
  comments: string;       // Colonne I
  shortDescription: string; // Colonne J
  tags: string;           // Colonne K
  category: string;       // Colonne L
  thumbnail: string;      // Colonne M
}

export interface VideoResponse {
  data: VideoData[];
  error?: string;
  metadata?: {
    errors?: string[];
    timestamp: number;
  };
}
