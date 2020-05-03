import { createHash } from "crypto";
import { EOperations, IDiff, IJoin, IMap, Operations } from "./types";

/**
 * Query builder utilities
 */

export const generatePlaceholders = (array: any[]) => {
  let index = 0;

  return array
    .map((row) => {
      const rowLength = Object.keys(row).length;
      const placeholders = new Array(rowLength)
        .fill(null)
        .map(() => `$${++index}`);

      return `(${placeholders.join(", ")})`;
    })
    .join(",\n\t");
};

export const flattenArrayOfObjects = (array: any[]): any[] => {
  return array.reduce((total, current) => {
    Object.keys(current).forEach((key) => {
      total.push(current[key]);
    });

    return total;
  }, []);
};

export const getUnique = (a: string[]): string[] => {
  const seen: { [key: string]: true } = {};

  return a.filter((item) => {
    return seen.hasOwnProperty(item) ? false : (seen[item] = true);
  });
};

export const createOffset = (options: {
  page?: number;
  offset?: number;
  limit?: number;
}): null | number => {
  if (options.offset) {
    return Math.max(options.offset, 0);
  }
  if (options.page) {
    const limit = options.limit ?? 24;
    const offset = limit * (options.page - 1);
    return Math.max(offset, 0);
  }
  return null;
};

const mergeDiff = ({ add, update, remove }: IDiff, d2: IDiff) => ({
  add: add.concat(d2.add),
  update: update.concat(d2.update),
  remove: remove.concat(d2.remove),
});

export const diffObjects = (
  obj1: { [key: string]: any },
  obj2: { [key: string]: any },
  _path: string[] = []
): IDiff => {
  const diff: IDiff = { add: [], remove: [], update: [] };

  return Object.keys({ ...obj1, ...obj2 }).reduce((total, propertyName) => {
    const path = _path.concat(propertyName);

    const def = obj1[propertyName] ?? null;
    const actual = obj2[propertyName] ?? null;

    if (def === actual) return total;

    const changes = {
      path,
      actual: actual !== null ? JSON.stringify(actual) : null,
      definition: def !== null ? JSON.stringify(def) : null,
    };

    // in database, not in definition
    if (actual !== null && def === null) {
      total.remove.push(changes);
      return total;
    }

    // in definition, not in database
    if (actual === null && def !== null) {
      total.add.push(changes);
      return total;
    }

    if (typeof def === "object" && typeof actual === "object") {
      return mergeDiff(total, diffObjects(def, actual, path));
    }

    total.update.push(changes);

    return total;
  }, diff);
};

export const hashString = (value = "") => {
  return createHash("md5").update(value).digest("hex");
};

export const pick = <T = IMap>(object: T, keys: (keyof T)[]): Partial<T> => {
  return keys.reduce((total: Partial<T>, key: keyof T) => {
    total[key] = object[key];
    return total;
  }, {});
};

export const parseConditions = ({
  where,
  values = [],
  columns = [],
  offset = 0,
  parentKey,
  compareBy,
}: {
  where: IMap;
  values?: any[];
  columns?: string[];
  offset?: number;
  parentKey?: string;
  compareBy?: Operations;
}) => {
  const parsed: {
    columns: string[];
    where: string | string[];
    values: any[];
  } = {
    values,
    columns,
    where: [],
  };

  parsed.where = Object.keys(where).reduce((total, key) => {
    const value = where[key];

    // if object
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const valueKeys = Object.keys(value);
      const comparator = valueKeys[0];

      // is key is an operator
      if (key.charAt(0) === "$") {
        const child = parseConditions({
          where: value,
          values,
          compareBy: key as Operations,
          offset,
        });

        total = total.concat(child.where);
      } else if (comparator.charAt(0) === "$") {
        const child = parseConditions({
          where: value,
          values,
          parentKey: key,
          offset,
        });

        total = total.concat(child.where);
      } else {
        throw new Error(`Key "${comparator}" cannot be used as a comparator`);
      }

      // if key is comparator
    } else if (key.charAt(0) === "$") {
      columns.push(parentKey);

      switch (key) {
        case "$GT":
        case "$GTE":
        case "$LT":
        case "$LTE":
        case "$NE": {
          values.push(value);
          total.push(
            `"${parentKey}" ${EOperations[key]} $${values.length + offset}`
          );
          break;
        }

        case "$ANY": {
          if (!Array.isArray(value)) {
            throw new Error("Value of op.ANY should be an array");
          }

          values.push(value);
          total.push(`"${parentKey}" = ANY($${values.length + offset})`);
          break;
        }

        case "$LIKE": {
          values.push(value);
          total.push(`"${parentKey}" LIKE $${values.length + offset}`);
          break;
        }

        default:
          throw new Error(`Comparator "${key}" is not supported`);
      }

      // if key is name of column
      // and value is null
    } else if (value === null) {
      columns.push(key);
      total.push(`"${key}" IS NULL`);

      // if key is name of column
      // and not undefined
    } else if (value !== undefined) {
      columns.push(key);
      values.push(value);

      let condition: string;

      // if column/key is in the pattern of <table>.<column> don't add parens
      if (key.includes(".")) {
        condition = key;
      } else {
        condition = `"${key}"`;
      }

      condition += ` = $${values.length + offset}`;

      total.push(condition);
    }

    return total;
  }, []);

  if (!compareBy) return parsed;

  // join each clause with comparator
  // otherwise it will automatically be joined by 'AND' later on
  // we're also wrapping in parens to preserve order of operations
  parsed.where = "(" + parsed.where.join(` ${EOperations[compareBy]} `) + ")";

  return parsed;
};

export const createConditions = ({
  where = {},
  offset = 0,
}: {
  where: IMap;
  offset?: number;
}): {
  conditions: string;
  values: any[];
} => {
  const voidResponse: {
    conditions: string;
    values: any[];
  } = {
    conditions: "",
    values: [],
  };

  if (!where) return voidResponse;

  const parsed = parseConditions({
    where,
    offset,
  });

  if (!parsed.where.length) {
    return voidResponse;
  }

  const joined =
    typeof parsed.where === "string"
      ? parsed.where
      : parsed.where.join(" AND ");

  const conditions = ["WHERE", `\t${joined}`].join("\n");

  return {
    conditions,
    values: parsed.values,
  };
};

export const createOrder = (orderBy: { [key: string]: "ASC" | "DESC" }) => {
  const columns = Object.keys(orderBy);

  if (!columns.length) return "";

  const text = ["ORDER BY"];

  const orders = columns
    .map((column) => {
      const direction = orderBy[column];

      return `\t"${column}"${direction !== "ASC" ? " DESC" : ""}`;
    })
    .join(",\n");

  return text.concat(orders).join("\n");
};

export const createInsert = ({
  data,
  returning,
  tableName,
  inserting,
}: {
  data: any[];
  returning?: string | string[];
  tableName: string;
  inserting: string[];
}) => {
  const sql = [];

  const ordered = data.map((col) => pick(col, inserting));

  const values = flattenArrayOfObjects(ordered);
  const placeholders = generatePlaceholders(ordered);
  const fields = inserting.map((c) => `"${c}"`).join(", ");

  sql.push(`\t(${fields})`);

  sql.push(`VALUES\n\t${placeholders}`);

  const _returning = createReturning(returning);
  if (_returning) sql.push(_returning);

  const hashedReturning = hashString(_returning);

  return {
    text: sql.join("\n"),
    values,
    name: `${tableName}-${data.length}-${hashedReturning}`.slice(63),
  };
};

export const createReturning = (returning?: string | string[]) => {
  if (!returning) return "";

  let _returning;

  if (Array.isArray(returning)) {
    _returning = returning.map((col) => `"${col}"`).join(", ");
  } else {
    _returning = returning;
  }

  return `RETURNING\n\t${_returning}`;
};

export const createGroupBy = (groupBy: string | string[]) => {
  if (!groupBy || !groupBy.length) return "";

  const text = ["GROUP BY"];
  const grouping = typeof groupBy === "string" ? groupBy : groupBy.join(", ");
  text.push("\t" + grouping);

  return text.join("\n");
};

export const createJoin = (join: IJoin | IJoin[]): string => {
  if (!join) return "";

  if (Array.isArray(join)) {
    return join.map((j) => createJoin(j)).join("\n");
  } else {
    const { type = "INNER", table } = join;
    const sql = [`${type} JOIN\n\t${table}`];
    sql.push(`ON\n\t${join.on}`);

    return sql.join("\n");
  }
};

export const createSelect = (select?: string | string[]) => {
  if (select) {
    if (typeof select === "string") return select;
    return select.join(", ");
  }

  return "*";
};
