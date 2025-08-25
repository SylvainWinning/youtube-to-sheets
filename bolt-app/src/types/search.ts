export interface SearchFilters {
  query: string;
  fields: Array<'title' | 'channel' | 'category'>;
}