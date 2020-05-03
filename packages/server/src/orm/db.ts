import { Pool, PoolClient, QueryResult } from "pg";
import { pool, preparedStatement, query } from "./connection";
import Model from "./Model";
import { IModelSchema, TAction } from "./types";
import { diffObjects } from "./utils";

type ICompleteSchema = { [key: string]: IModelSchema };

interface IConstraintDef {
  type: "p" | "f" | "u";
  constraint_name: string;
  table_name: string;
  table_references: string | null;
  column_name: string | null;
  column_references: string | null;
  on_update: keyof TAction;
  on_delete: keyof TAction;
}

interface IColumnDef {
  column_name: "parentId";
  column_default: null | string;
  character_maximum_length: null | number;
  numeric_precision: null | number;
  numeric_scale: null | number;
  is_nullable: "YES" | "NO";
  data_type: string;
  udt_name: string;
}

const onActionType: TAction = {
  a: undefined,
  r: "RESTRICT",
  c: "CASCADE",
  n: "SET NULL",
  d: "SET DEFAULT",
};

const getColumnType = (c: IColumnDef, constraintDef: IConstraintDef) => {
  const TYPE = c.data_type;

  // primary key
  if (constraintDef && constraintDef.type === "p") {
    if (TYPE === "INTEGER") return "SERIAL";
  }

  switch (TYPE) {
    case "USER-DEFINED":
      return c.udt_name;

    case "CHARACTER VARYING":
      return `VARCHAR(${c.character_maximum_length})`;

    case "NUMERIC":
      return `NUMERIC(${c.numeric_precision}, ${c.numeric_scale})`;

    default:
      return TYPE;
  }
};

export default class DB<T extends { [key: string]: Model }> {
  models: T;
  modelKeys: (keyof T)[];
  extensions: string[];
  pool: Pool;
  preparedStatement: <Rows = any>(
    {
      text,
      name,
      values,
    }: {
      text: string;
      name?: string;
      values?: any[];
    },
    client?: PoolClient
  ) => Promise<QueryResult<Rows>>;
  query: <Rows = any>(
    sql: string,
    values?: any[],
    client?: PoolClient
  ) => Promise<QueryResult<Rows>>;

  constructor({
    models,
    extensions = [],
  }: {
    extensions?: string[];
    models: T;
  }) {
    this.models = models;
    this.modelKeys = Object.keys(this.models) as (keyof T)[];
    this.extensions = extensions;

    this.pool = pool;
    this.preparedStatement = preparedStatement;
    this.query = query;
  }

  async init() {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Cannot be run in production");
    }

    /**
     * Creates entire table schema
     * We must await each query because altering the table will deadlock
     */

    try {
      const tableSQL = this.modelKeys.map((key: keyof T) =>
        this.models[key].define()
      );
      /**
       * Install db extensions
       */

      for (const extension of this.extensions) {
        await this.query(`CREATE EXTENSION IF NOT EXISTS ${extension}`);
      }

      /**
       * Destroy all tables
       */
      for (const sql of tableSQL) {
        await this.query(sql.destroyTable);
      }

      /**
       * Create tables
       */
      for (const sql of tableSQL) {
        await this.query(sql.table);
      }

      /**
       * Add columns with foreign keys
       */
      const addForeignKeys = tableSQL.flatMap((sql) => sql.foreignKeys);

      for (const fkDef of addForeignKeys) {
        await this.query(fkDef);
      }

      /**
       * Add group unique constraints to columns (if applicable)
       */
      const addGroupConstraints = tableSQL.flatMap(
        (sql) => sql.addUniqueGroupConstraints
      );

      for (const uniqueGroupDef of addGroupConstraints) {
        await this.query(uniqueGroupDef);
      }

      /**
       * Add seed data
       */

      for (const modelName of this.modelKeys) {
        const model = this.models[modelName];

        await model.seed();
      }

      // tslint:disable-next-line
      console.log("Database initialized");

      return true;
    } catch (err) {
      // tslint:disable-next-line
      console.log("Database failed to initialize", err);

      return false;
    }
  }

  async transact<T1 = any>(callback: (client: PoolClient) => T1): Promise<T1> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      // execute transaction here asynchronously by passing client to the callback
      const response = await callback(client);

      await client.query("COMMIT");

      return response;
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }

  /**
   * Returns the difference between your model definitions
   * and the current database schema
   */

  async migrate() {
    const { rows: constraints } = await preparedStatement<IConstraintDef>({
      text: `
        SELECT
          contype as type,
          conname as constraint_name,
          conrelid::regclass as table_name,
          confrelid::regclass as table_references,
          a1.attname as column_name,
          a2.attname as column_references,
          confupdtype as on_update,
          confdeltype as on_delete
        FROM (
          SELECT
            pg_constraint.*,
            UNNEST(pg_constraint.conkey) u_conkey,
            UNNEST(pg_constraint.confkey) u_confkey
          FROM  pg_constraint
        ) as pgc
        LEFT JOIN
          pg_attribute a1 ON a1.attnum = pgc.u_conkey AND a1.attrelid = conrelid
        LEFT JOIN
          pg_attribute a2 ON a2.attnum = pgc.u_confkey AND a2.attrelid = confrelid
        ORDER BY
          table_name, contype;
      `,
    });

    const schemaDef = this.modelKeys.reduce((total: ICompleteSchema, key) => {
      const { schema } = this.models[key];

      total[key as keyof ICompleteSchema] = Object.keys(schema).reduce(
        (innerTotal: IModelSchema, columnName) => {
          const column = schema[columnName];

          innerTotal[columnName] = column;
          if (column.pk) {
            innerTotal[columnName].required = true;
          }

          if (column.fk) {
            innerTotal[columnName] = {
              type: "INTEGER",
              ...column,
              fk: {
                column: "id",
                ...column.fk,
              },
            };
          }

          if (column.uniqueGroup) {
            delete innerTotal[columnName].uniqueGroup;
            innerTotal[columnName].unique = true;
          }

          return innerTotal;
        },
        {}
      );

      return total;
    }, {});

    const actualSchemaArray = await Promise.all(
      this.modelKeys.map(
        async (modelKey): Promise<[string, IModelSchema]> => {
          const model = this.models[modelKey];

          const tableConstraints = constraints.filter(
            (c) => c.table_name === model.tableName
          );

          // PRIMARY KEYS
          const pks = tableConstraints.filter((c) => c.type === "p");

          // FOREIGN KEYS
          const fks = tableConstraints.filter((c) => c.type === "f");

          // UNIQUE KEYS
          const uks = tableConstraints.filter((c) => c.type === "u");

          // COLUMNS
          const { rows: columnsDef } = await this.preparedStatement<IColumnDef>(
            {
              text: `
                SELECT
                  column_name,
                  column_default,
                  character_maximum_length,
                  numeric_precision,
                  numeric_scale,
                  is_nullable,
                  UPPER(data_type) as data_type,
                  UPPER(udt_name) as udt_name
                FROM
                  information_schema.COLUMNS
                WHERE
                  TABLE_NAME = '${model.tableName}';
              `,
            }
          );

          const formatted = columnsDef.reduce(
            (total: IModelSchema, c: IColumnDef) => {
              const columnName = c.column_name;

              const pkDef = pks.find((pk) => pk.column_name === columnName);
              const fkDef = fks.find((pk) => pk.column_name === columnName);
              const unique = uks.find((pk) => pk.column_name === columnName);
              const type = getColumnType(c, pkDef);

              total[columnName] = { type };

              if (c.is_nullable === "NO") {
                total[columnName].required = true;
              }

              if (unique) {
                total[columnName].unique = true;
              }

              if (pkDef) {
                total[columnName].pk = true;
                if (type !== "SERIAL") {
                  total[columnName].defaultValue = c.column_default;
                }
              } else if (c.column_default !== null) {
                total[columnName].defaultValue = c.column_default;
              }

              if (fkDef) {
                total[columnName].fk = {
                  table: fkDef.table_references,
                  column: fkDef.column_references,
                };

                const onUpdate = onActionType[fkDef.on_update];
                const onDelete = onActionType[fkDef.on_delete];

                if (onUpdate) {
                  total[columnName].fk.onUpdate = onUpdate;
                }

                if (onDelete) {
                  total[columnName].fk.onDelete = onDelete;
                }
              }

              return total;
            },
            {}
          );

          return [modelKey as string, formatted];
        }
      )
    );

    const actualSchema = actualSchemaArray.reduce(
      (total: { [key: string]: IModelSchema }, [key, def]) => {
        total[key] = def;
        return total;
      },
      {}
    );

    const diff = diffObjects(schemaDef, actualSchema);

    return {
      diff,
      actual: actualSchema,
    };
  }
}
