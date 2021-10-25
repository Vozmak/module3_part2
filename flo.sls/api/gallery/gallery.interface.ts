export interface Gallery {
  objects: Array<string | undefined>;
  page: number;
  total: number;
}

export interface Query {
  page?: string;
  limit?: string;
  filter?: string;
}
