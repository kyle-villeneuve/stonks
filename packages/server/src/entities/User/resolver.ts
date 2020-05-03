import db from "../../db";
import { IMutationResolvers } from "../../schema";
import { sign } from "jsonwebtoken";

interface IResolverMap {
  Mutation: {
    register: IMutationResolvers["register"];
  };
}

const resolverMap: IResolverMap = {
  Mutation: {
    register: async (_p, args, { res }) => {
      // try {
      const { id, username, password } = await db.models.User.create({
        data: args,
        returning: "id, username, password",
      });

      const tokenPromise = sign(
        {
          id,
          username,
        },
        process.env.TOKEN_SECRET as string,
        {
          expiresIn: "15m",
        }
      );

      const refreshTokenPromise = sign(
        { id },
        process.env.REFRESH_SECRET + password,
        {
          expiresIn: "7d",
        }
      );

      const [token, refreshToken] = await Promise.all([
        tokenPromise,
        refreshTokenPromise,
      ]);

      res.setHeader("X-Token", token);
      res.setHeader("X-Refresh-Token", refreshToken);
      // } catch (err) {
      //   return [];
      // }
    },
  },
};

export default resolverMap;
