import { gql } from "apollo-server";

export default gql`
  type DBDiffChange {
    path: [Any!]!
    actual: String
    definition: String
  }
  type DBDiff {
    add: [DBDiffChange]!
    update: [DBDiffChange]!
    remove: [DBDiffChange]!
  }
  type DBSchema {
    diff: DBDiff!
    actual: String!
  }
  type Query {
    schema: DBSchema!
  }
`;
