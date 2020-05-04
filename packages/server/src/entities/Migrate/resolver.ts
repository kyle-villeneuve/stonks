import db from "../../db";
import restrict from "../../middleware/_restrict";
import { IQueryResolvers } from "../../schema";

interface ResolverMap {
  Query: {
    schema: IQueryResolvers["schema"];
  };
}

const resolvers: ResolverMap = {
  Query: {
    schema: restrict("SUPER_USER", () => db.migrate()),
  },
};

export default resolvers;
