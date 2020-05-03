export type ValueOf<T> = T[keyof T];

export interface IMap<T = any> {
  [key: string]: T;
}

export type TAction = {
  a: void;
  r: "RESTRICT";
  c: "CASCADE";
  n: "SET NULL";
  d: "SET DEFAULT";
};

export interface IModelColumn {
  type?: string;
  defaultValue?: string;
  required?: boolean;
  unique?: boolean;
  uniqueGroup?: string;
  pk?: boolean;
  fk?: {
    table: string;
    column?: string;
    onUpdate?: ValueOf<TAction>;
    onDelete?: ValueOf<TAction>;
  };
}

export interface IModelSchema {
  [key: string]: IModelColumn;
}

export interface IJoin {
  on: string;
  table: string;
  type?: "INNER" | "LEFT" | "RIGHT";
}

export interface ISelectArguments {
  select?: string | string[];
  where?: IMap;
  join?: IJoin | IJoin[];
  orderBy?: { [key: string]: "ASC" | "DESC" };
  limit?: number;
  offset?: number;
  page?: number;
  groupBy?: string | string[];
}

export interface IChange {
  path: (string | number)[];
  actual: string | null | void;
  definition: string | null | void;
}

export interface IDiff {
  add: IChange[];
  update: IChange[];
  remove: IChange[];
}

export enum EOperations {
  $ANY = "ANY",
  $LIKE = "LIKE",
  $OR = "OR",
  $AND = "AND",
  $GT = ">",
  $GTE = ">=",
  $LT = "<",
  $LTE = "<=",
  $NE = "<>",
}

export type Operations = keyof typeof EOperations;
