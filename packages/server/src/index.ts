import { ApolloServer } from "apollo-server";
import context from "./middleware";
import { config } from "dotenv-flow";
import { fileLoader, mergeResolvers, mergeTypes } from "merge-graphql-schemas";
import { join } from "path";

config();

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
    console.log(error);
    return error;
  },
  playground: {
    settings: {
      // @ts-ignore
      "schema.polling.enable": false,
    },
  },
});

const port = Number(process.env.PORT) || 3000;

server.listen(port).then(({ url }) => {
  console.log(
    "\n",
    `🚀 Server running in ${process.env.NODE_ENV} mode at ${url}`
  );
});
