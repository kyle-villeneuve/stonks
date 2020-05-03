import { compare, hash } from "bcrypt";
import db from "../../db";
import restrict from "../../middleware/_restrict";
import { IMutationResolvers } from "../../schema";
import { formatErrors } from "../../utils";
import { createTokens } from "./controller";

interface IResolverMap {
  Mutation: {
    register: IMutationResolvers["register"];
    login: IMutationResolvers["login"];
    userUpdate: IMutationResolvers["userUpdate"];
  };
}

const resolverMap: IResolverMap = {
  Mutation: {
    register: async (_p, args, { res }) => {
      try {
        if (args.password.length < 8) {
          return {
            ok: false,
            errors: [
              {
                field: "password",
                message: "password must be at least 8 characters",
              },
            ],
          };
        }

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

    userUpdate: restrict("LOGGED_IN", async (_p, args, { user: { id } }) => {
      try {
        const [user] = await db.models.User.update({
          set: args,
          returning: "*",
          where: { id },
        });

        if (!user) {
          return {
            ok: false,
            errors: [
              {
                field: "id",
                message: "user not",
              },
            ],
          };
        }

        return {
          ok: true,
          user,
        };
      } catch (err) {
        return {
          ok: false,
          errors: formatErrors(err),
        };
      }
    }),
  },
};

export default resolverMap;
