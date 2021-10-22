export interface Gallery {
  objects: Array<string>;
  page: number;
  total: number;
}

export interface Query {
  page?: string;
  limit?: string;
  filter?: string;
}
