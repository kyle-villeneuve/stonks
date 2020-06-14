import { gql } from "apollo-server";

export default gql`
  type Query {
    latest10Q(ticker: String!): Any
  }
`;
