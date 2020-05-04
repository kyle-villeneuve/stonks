import { gql } from "apollo-server";

export default gql`
  scalar Any
  scalar Date

  type Error {
    field: String!
    message: String
  }

  type GenericResponse {
    ok: Boolean!
    errors: [Error!]
  }
`;
