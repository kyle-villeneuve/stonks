import { gql } from "apollo-server";

export default gql`
  scalar Date

  type Error {
    field: String!
    message: String
  }

  type Query {
    test: String
  }
  type Mutation {
    test: String
  }
`;
