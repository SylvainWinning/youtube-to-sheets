export interface SheetTab {
  name: string;
  range: string;
  durationRange: {
    min: number | null;
    max: number | null;
  };
}
