import { compare, hash } from "bcrypt";
import db from "../../db";
import { IMutationResolvers } from "../../schema";
import { formatErrors } from "../../utils";
import { createTokens } from "./controller";

interface IResolverMap {
  Mutation: {
    register: IMutationResolvers["register"];
    login: IMutationResolvers["login"];
  };
}

const resolverMap: IResolverMap = {
  Mutation: {
    register: async (_p, args, { res }) => {
      try {
        const password = await hash(args.password, 10);

        const user = await db.models.User.create({
          data: {
            ...args,
            password,
          },
          returning: "id, username, password",
        });

        const [token, refreshToken] = await createTokens(user);

        res.setHeader("X-Token", token);
        res.setHeader("X-Refresh-Token", refreshToken);

        return {
          ok: true,
        };
      } catch (err) {
        return {
          ok: false,
          errors: formatErrors(err),
        };
      }
    },

    login: async (_p, { usernameOrEmail, password }, { res }) => {
      const [user] = await db.models.User.find({
        where: { $OR: { username: usernameOrEmail, email: usernameOrEmail } },
      });

      if (!user) {
        return {
          ok: false,
          errors: [
            {
              field: "usernameOrEmail",
              message: "user doesn't exist",
            },
          ],
        };
      }

      const isValidPassword = await compare(password, user.password);

      if (!isValidPassword) {
        return {
          ok: false,
          errors: [
            {
              field: "password",
              message: "incorrect password",
            },
          ],
        };
      }

      const [token, refreshToken] = await createTokens(user);

      res.setHeader("X-Token", token);
      res.setHeader("X-Refresh-Token", refreshToken);

      return {
        ok: true,
      };
    },
  },
};

export default resolverMap;
