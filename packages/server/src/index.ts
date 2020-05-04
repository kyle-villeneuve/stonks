import { ApolloServer, ServerInfo } from "apollo-server";
import { fileLoader, mergeResolvers, mergeTypes } from "merge-graphql-schemas";
import { join } from "path";
import { NODE_ENV, PORT } from "./config";
import db from "./db";
import context from "./middleware";

const resolvers = mergeResolvers(
  fileLoader(join(__dirname, "entities/**/resolver.ts"))
);

const typeDefs = mergeTypes(
  fileLoader(join(__dirname, "entities/**/schema.ts"))
);

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context,
  formatError: (error) => {
    return error;
  },
  playground: {
    settings: {
      // @ts-ignore
      "schema.polling.enable": false,
    },
  },
});

server.listen(PORT).then(({ url }: ServerInfo) => {
  db.init();
  console.log("\n", `🚀 Server running in ${NODE_ENV} mode at ${url}`);
});
