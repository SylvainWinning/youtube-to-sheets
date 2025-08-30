export interface SheetTab {
  name: string;
  range: string;
  durationRange: {
    min: number | null;
    max: number | null;
  };
}

export interface SheetData {
  id: string;
  values: any[][];
}

export interface SheetResponse {
  data: SheetData;
  error?: string;
}
