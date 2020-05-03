import { gql } from "apollo-server";

export default gql`
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
