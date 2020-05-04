import { Request, Response } from "express";
import { verify } from "jsonwebtoken";
import { TOKEN_SECRET } from "../config";
import { refreshTokens } from "../entities/User/controller";

export interface Context {
  user: {
    id?: string;
    username?: string;
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
  const token = req.headers["x-token"] as string;
  const refreshToken = req.headers["x-refresh-token"] as string;

  const context: Context = {
    res,
    user: {},
  };

  if (!token) return context;

  try {
    context.user = verify(token, TOKEN_SECRET) as Context["user"];
  } catch (_error) {}

  if (!context.user && refreshToken) {
    const [user, newToken, newRefreshToken] = await refreshTokens(refreshToken);

    context.user = user;

    newToken && res.setHeader("X-Token", newToken);
    newRefreshToken && res.setHeader("X-Refresh-Token", newRefreshToken);
  }

  return context;
};
