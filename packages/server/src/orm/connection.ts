import { Pool, PoolClient } from "pg";
import { DATABASE_URL } from "../config";
import { hashString } from "./utils";

export const pool = new Pool({
  connectionString: DATABASE_URL,
});

export const query = <Rows = any[]>(
  sql: string,
  values?: any[],
  client?: PoolClient
) => {
  return client
    ? client.query<Rows>(sql, values)
    : pool.query<Rows>(sql, values);
};

export const preparedStatement = <Rows = any>(
  args: {
    text: string;
    name?: string;
    values?: any[];
  },
  client?: PoolClient
) => {
  const name = args.name || hashString(args.text);

  const queryObj = { name, text: args.text, values: args.values };

  return client ? client.query<Rows>(queryObj) : pool.query<Rows>(queryObj);
};
