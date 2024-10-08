import type { SparseField } from './buildGqlQuery';

export type FilterComparison<T> = {
  eq?: T;
  gt?: T;
  gte?: T;
  iLike?: T;
  in?: T[];
  is?: boolean;
  isNot?: boolean;
  like?: T;
  lt?: T;
  lte?: T;
  neq?: T;
  notILike?: T;
  notIn?: T[];
  notLike?: T;
  between?: ComparisonBetween;
  notBetween?: ComparisonBetween;
};

export type ComparisonBetween = {
  lower: any;
  upper: any;
};

export enum SortDirection {
  Asc = 'ASC',
  Desc = 'DESC',
}

export type Filter = {
  and?: Filter[];
  or?: Filter[];
  [key: string]: FilterComparison<any>;
};

export type QueryMeta = {
  sparseFields?: SparseField[];
};

export type QueryArgs = {
  filter?: Filter;
  paging?: { limit: number; offset: number };
  sorting?: { field: string; direction: SortDirection }[];
  meta?: QueryMeta;
};

export type CreateOneInput = {
  /** The record to create */
  [resourceName: string]: any;
};

export type MutationCreateOneArgs = {
  input: CreateOneInput;
};

export type UpdateOneInput = {
  id: any;
  /** The update to apply. */
  update: any;
};

export type MutationUpdateOneArgs = {
  input: UpdateOneInput;
};

export type UpdateManyInput = {
  filter: Filter;
  /** The update to apply. */
  update: any;
};

export type MutationUpdateManyArgs = {
  input: UpdateManyInput;
};

export type DeleteOneInput = {
  id: any;
};

export type MutationDeleteOneArgs = {
  input: DeleteOneInput;
};

export type DeleteManyInput = {
  filter: Filter;
  /** The update to apply. */
};

export type MutationDeleteManyArgs = {
  input: DeleteManyInput;
};

export type PageInfo = {
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
};

export type Connection = {
  nodes: any[];
  pageInfo: PageInfo;
  totalCount: number;
};
