/** Shape of entries in `apps/backend/src/assets/data/israel-localities.json` */
export interface IsraelLocality {
  cityId: number;
  englishName: string;
  hebrewName: string;
}

/** `GET /localities` query. Backend: `SearchLocalitiesQueryDto implements SearchLocalitiesQuery`. */
export interface SearchLocalitiesQuery {
  /** Hebrew or English name; empty returns the first localities alphabetically. */
  search?: string;
  limit?: number;
}
