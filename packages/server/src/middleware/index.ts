import { Request, Response } from "express";
import { verify } from "jsonwebtoken";
import { TOKEN_SECRET } from "../config";
import { refreshTokens } from "../entities/User/controller";

export interface Context {
  user: {
    id: string | null;
    username: string | null;
  };
  res: Response;
}

export default async ({
  req,
  res,
}: {
  req: Request;
  res: Response;
}): Promise<Context> => {
  // get the auth tokens from headers
  const token = req.headers["x-token"] as string;
  const refreshToken = req.headers["x-refresh-token"] as string;

  // define base context (regardless of auth status)
  const context: Context = {
    res,
    user: {
      id: null,
      username: null,
    },
  };

  // attempt to include user to context
  try {
    if (token) {
      context.user = verify(token, TOKEN_SECRET) as Context["user"];
    }
  } catch (_error) {}

  // if the auth token is invalid
  // try to issue new tokens
  if (!context.user && refreshToken) {
    const refreshedTokenData = await refreshTokens(refreshToken);

    // if unable to issue new tokens, return base context
    if (!refreshedTokenData) return context;

    // if we were able to issue new tokens
    const [user, newToken, newRefreshToken] = refreshedTokenData;

    // pass user to context
    context.user = user;

    // set headers containg new auth tokens
    res.setHeader("X-Token", newToken);
    res.setHeader("X-Refresh-Token", newRefreshToken);
  }

  return context;
};
