import { PoolClient } from "pg";
import { preparedStatement } from "./connection";
import { IMap, IModelSchema, ISelectArguments } from "./types";
import {
  createConditions,
  createGroupBy,
  createInsert,
  createJoin,
  createOffset,
  createOrder,
  createReturning,
  createSelect,
} from "./utils";

export default class Model<T = any> {
  tableName: string;
  schema: IModelSchema;
  seedData?: IMap[];

  constructor(
    tableName: string,
    {
      schema,
      seedData,
    }: {
      schema: IModelSchema;
      seedData?: IMap[];
    }
  ) {
    this.tableName = tableName;
    this.schema = schema;
    this.seedData = seedData;
  }

  columns({
    default: defaultColumns,
    fk,
    prefix,
    raw,
    pk,
  }: {
    default?: true;
    fk?: true;
    prefix?: string;
    raw?: true;
    pk?: true;
  }) {
    let cols = Object.keys(this.schema);

    if (!fk) {
      // remove foreign keys
      cols = cols.filter((col) => !this.schema[col].fk);
    }

    if (!pk) {
      // remove primary keys
      cols = cols.filter((col) => !this.schema[col].pk);
    }

    // remove default columns
    if (!defaultColumns) {
      cols = cols.filter((col) => this.schema[col].defaultValue === undefined);
    }

    if (raw) return cols;

    return cols.map((col) => {
      if (prefix) {
        return `"${prefix}"."${col}"`;
      }

      return `"${col}"`;
    });
  }

  define() {
    const { schema, tableName } = this;

    /**
     * REFINE COLUMNS BY TYPE
     * (foreign key, primary key, etc.)
     */

    interface IRefinedColumns {
      uniqueGroups: IMap<string[]>;
      regular: string[];
      foreign: string[];
      primary: string[];
    }

    const columns: IRefinedColumns = Object.keys(schema).reduce(
      (total: IRefinedColumns, field) => {
        const schemaField = schema[field];

        if (schemaField.uniqueGroup !== undefined) {
          if (!total.uniqueGroups[schemaField.uniqueGroup]) {
            total.uniqueGroups[schemaField.uniqueGroup] = [field];
          } else {
            total.uniqueGroups[schemaField.uniqueGroup].push(field);
          }
        }

        const { fk, pk } = schemaField;

        if (fk !== undefined) {
          total.foreign.push(field);
          return total;
        }

        if (pk) total.primary.push(field);

        total.regular.push(field);

        return total;
      },
      {
        uniqueGroups: {},
        regular: [],
        foreign: [],
        primary: [],
      }
    );

    /**
     * DEFINE REGULAR COLUMNS
     */

    const setColumns = columns.regular
      .map((field) => {
        const { type, defaultValue, required, unique } = schema[field];

        const definition = [];

        definition.push(`"${field}" ${type}`);

        if (unique) definition.push("UNIQUE");

        if (required) definition.push("NOT NULL");

        if (defaultValue !== undefined) {
          definition.push(`DEFAULT ${defaultValue}`);
        }

        return definition.join(" ");
      })
      .join(", ");

    /**
     * DEFINE PRIMARY KEYS
     */
    const setPrimaryKeys = columns.primary.length
      ? `, PRIMARY KEY (${columns.primary.map((c) => `"${c}"`).join(", ")})`
      : "";

    /**
     * CREATE THE TABLE
     */
    const table = `CREATE TABLE IF NOT EXISTS "${tableName}" (${setColumns}${setPrimaryKeys})`;

    /**
     * ADD FOREIGN KEYS
     */
    const foreignKeys = columns.foreign.map((column) => {
      const { fk, unique, required, defaultValue, type = "INTEGER" } = schema[
        column
      ];

      const definition = [];

      definition.push(`ALTER TABLE "${tableName}"`);
      definition.push(`ADD COLUMN IF NOT EXISTS "${column}" ${type}`);

      if (unique) definition.push("UNIQUE");

      if (required) definition.push("NOT NULL");

      if (defaultValue !== undefined) {
        definition.push(`DEFAULT ${defaultValue}`);
      }

      if (fk) {
        const { table: tableReference, column: columnReference = "id" } = fk;

        definition.push(
          `REFERENCES "${tableReference}" ("${columnReference}")`
        );

        if (fk.onUpdate) definition.push(`ON UPDATE ${fk.onUpdate}`);
        if (fk.onDelete) definition.push(`ON DELETE ${fk.onDelete}`);
      }

      return definition.join(" ");
    });

    /**
     * DESTROY TABLE
     */
    const destroyTable = `DROP TABLE IF EXISTS "${tableName}" CASCADE;`;

    /**
     * ADD UNIQUE GROUP CONSTRAINTS
     */

    const addUniqueGroupConstraints = Object.keys(columns.uniqueGroups).map(
      (groupKey) => {
        const fields = columns.uniqueGroups[groupKey]
          .map((c) => `"${c}"`)
          .join(", ");

        return `ALTER TABLE "${tableName}" ADD CONSTRAINT "${tableName}_${groupKey}" UNIQUE (${fields})`;
      }
    );

    return {
      table,
      foreignKeys,
      destroyTable,
      addUniqueGroupConstraints,
    };
  }

  async seed() {
    if (!this.seedData || !this.seedData.length) return false;

    const {
      rows: [{ count }],
    } = await preparedStatement({
      name: `${this.tableName}-getCount`,
      text: `SELECT count(*) FROM "${this.tableName}"`,
    });

    if (count > 0) return false;

    await this.bulkCreate({ data: this.seedData });

    return true;
  }

  async findById<T1 = T>(
    {
      id,
      select = "*",
    }: {
      id: string | number;
      select?: string | string[];
    },
    client?: PoolClient
  ) {
    return this.findOne<T1>({ where: { id }, select }, client);
  }

  async findOne<T1 = T>(args: ISelectArguments, client?: PoolClient) {
    const [row] = await this.find<T1>({ ...args, limit: 1 }, client);
    return row;
  }

  async find<T1 = T>(
    {
      where,
      join,
      orderBy = {},
      limit,
      offset,
      page,
      groupBy,
      select,
    }: ISelectArguments = {},
    client?: PoolClient
  ) {
    const { conditions, values } = createConditions({
      where,
    });

    // SELECT
    const sql = ["SELECT"];

    // COLUMNS
    const columns = createSelect(select);
    sql.push(`\t` + columns);

    // FROM
    sql.push(`FROM\n\t${this.tableName}`);

    // JOIN
    const joinClause = createJoin(join);
    if (joinClause) sql.push(joinClause);

    // WHERE
    if (conditions) sql.push(conditions);

    // GROUP BY
    const groupByClause = createGroupBy(groupBy);
    if (groupByClause) sql.push(groupByClause);

    // ORDER BY
    const orderByClause = createOrder(orderBy);
    if (orderByClause) sql.push(orderByClause);

    // LIMIT
    if (limit) sql.push(`LIMIT\n\t${limit}`);

    // OFFSET
    const _offset = createOffset({ page, limit, offset });
    if (_offset) {
      sql.push(`OFFSET\n\t${_offset}`);
    }

    const queryObj = {
      text: sql.join("\n"),
      values,
    };

    const { rows } = await preparedStatement<T1>(queryObj, client);

    return rows;
  }

  async create<T1 = T>(
    {
      data,
      returning,
    }: {
      data: IMap;
      returning?: string | string[];
    },
    client?: PoolClient
  ) {
    const [row] = await this.bulkCreate<T1>(
      { data: [data], returning },
      client
    );
    return row;
  }

  async bulkCreate<T1 = T>(
    {
      data = [],
      returning,
    }: {
      data: any[];
      returning?: string | string[];
    },
    client?: PoolClient
  ) {
    if (!data || !data.length) return [];

    const filteredData = data.filter((d) => !!d);

    if (!filteredData.length) return [];

    // INSERT INTO <table>
    const sql = [`INSERT INTO\n\t"${this.tableName}"`];

    // VALUES (col) = (col), (col2)
    const { text, values, name } = createInsert({
      data,
      returning,
      tableName: this.tableName,
      inserting: this.columns({ fk: true, raw: true }),
    });

    sql.push(text);

    const { rows } = await preparedStatement<T1>(
      {
        name,
        values,
        text: sql.join("\n"),
      },
      client
    );

    return rows;
  }

  async update<T1 = T>(
    {
      set,
      where,
      returning,
    }: {
      set: IMap;
      where: IMap;
      returning?: string | string[];
    },
    client?: PoolClient
  ) {
    const hasUpdatedAt = Object.keys(this.schema).includes("updatedAt");

    const setColumns = Object.keys(set).filter((key) => set[key] !== undefined);
    const setValues = setColumns.map((key) => set[key]);

    const WHERE = createConditions({
      where,
      offset: setValues.length,
    });

    // UPDATE <table>
    const sql = [`UPDATE\n\t${this.tableName}`];

    // SET COLUMNS
    const columnPlaceholders = setColumns.map((col) => `"${col}"`);
    const valuePlaceholders = setColumns.map((_, index) => `$${index + 1}`);

    if (hasUpdatedAt) {
      // if the table has an "updatedAt" column we'll automatically update to current time
      columnPlaceholders.push('"updatedAt"');
      valuePlaceholders.push("CURRENT_TIMESTAMP");
    }

    // SET VALUES
    const SET =
      columnPlaceholders.length > 1
        ? `SET\n\t(${columnPlaceholders.join(
            ", "
          )}) =\n\t(${valuePlaceholders.join(", ")})`
        : `SET\n\t${columnPlaceholders.join(", ")} = ${valuePlaceholders.join(
            ", "
          )}`;

    sql.push(SET);

    // WHERE
    sql.push(WHERE.conditions);

    // RETURNING
    sql.push(createReturning(returning));

    const queryObj = {
      text: sql.join("\n"),
      values: setValues.concat(WHERE.values),
    };

    const { rows } = await preparedStatement<T1>(queryObj, client);

    return rows;
  }

  async deleteById(id: string | number, client?: PoolClient) {
    const { rowCount } = await preparedStatement(
      {
        name: `${this.tableName}-deleteById`,
        text: `
          DELETE FROM
            ${this.tableName}
          WHERE
            id = $1
        `,
        values: [id],
      },
      client
    );

    return rowCount === 1;
  }

  async delete<T1 = T>(
    {
      where,
      returning,
    }: {
      where: IMap;
      returning?: string | string[];
    },
    client?: PoolClient
  ) {
    if (where === undefined || where === null || !Object.keys(where).length) {
      throw new Error("Where must have conditions in Model.delete");
    }

    const sql = [`DELETE FROM\n\t${this.tableName}`];

    const { conditions, values } = createConditions({
      where,
    });

    sql.push(conditions);

    sql.push(createReturning(returning));

    const { rows } = await preparedStatement<T1>(
      {
        text: sql.join("\n"),
        values,
      },
      client
    );

    return rows;
  }
}
