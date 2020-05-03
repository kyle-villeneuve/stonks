import { gql } from "apollo-server";

export default gql`
  type User {
    id: ID!
    createdAt: Date!
    updatedAt: Date
    email: String!
    username: String!
  }

  type UserResponse {
    ok: Boolean!
    user: User
    errors: [Error!]
  }

  type Mutation {
    register(
      username: String!
      email: String!
      password: String!
    ): GenericResponse!
    login(usernameOrEmail: String!, password: String!): GenericResponse!
    userUpdate(username: String): UserResponse!
  }

  type Query {
    me: User!
  }
`;
