import { IModelColumn, IModelSchema } from "./types";

export const id: IModelColumn = {
  type: "SERIAL",
  pk: true,
};

export const createdAt: IModelColumn = {
  type: "TIMESTAMP WITH TIME ZONE",
  defaultValue: "CURRENT_TIMESTAMP",
  required: true,
};

export const updatedAt: IModelColumn = {
  type: "TIMESTAMP WITH TIME ZONE",
};

export const defaultSchema: IModelSchema = {
  id,
  createdAt,
  updatedAt,
};
