export type SortDir = 'asc' | 'desc';
export type SortBy = 'createdAt' | 'updatedAt' | 'amount'; // ajusta por colección

export type Sort = {
  sortBy: SortBy;
  sortDir: SortDir;
};
