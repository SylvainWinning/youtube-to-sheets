export interface SheetError {
  error: {
    code: number;
    message: string;
    status: string;
  };
}

export interface SheetResponse {
  values?: any[][];
  error?: string;
}

export interface ApiResponse<T> {
  data: T;
  error?: string;
  metadata?: {
    warnings?: string[];
    source: 'local' | 'sheets';
    /** Time this valid response was loaded, not the age of the underlying data. */
    timestamp: number;
    /** Publication date of the local copy, when supplied by the server. */
    publishedAt?: number;
  };
}
