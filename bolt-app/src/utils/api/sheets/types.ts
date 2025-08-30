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
    errors?: string[];
    timestamp: number;
  };
}
