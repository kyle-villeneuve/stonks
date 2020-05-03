import { Pool, PoolClient } from "pg";
import { hashString } from "./utils";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("perfORM requires environment variable `DATABASE_URL`");
}

export const pool = new Pool({
  connectionString,
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
