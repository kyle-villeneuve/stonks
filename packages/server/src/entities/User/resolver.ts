import db from "../../db";
import { IMutationResolvers } from "../../schema";

interface IResolverMap {
  Mutation: {
    register: IMutationResolvers["register"];
  };
}

const resolverMap: IResolverMap = {
  Mutation: {
    register: async (_p, args, { res }) => {
      const user = await db.models.User.create({ data: args, returning: "*" });
      console.log({ args, user });

      if (user) {
        res.setHeader("X-Token", "test");
        res.setHeader("X-Refresh-Token", "refreshToken");
      }

      return true;
    },
  },
};

export default resolverMap;
