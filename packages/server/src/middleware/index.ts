import { Request, Response } from "express";
import { verify } from "jsonwebtoken";

export interface Context {
  user?: {
    id: string;
    username: string;
  };
  res: Response;
}

const secret = process.env.TOKEN_SECRET as string;

export default ({ req, res }: { req: Request; res: Response }): Context => {
  const token = req.headers["x-token"] as string;
  const refreshToken = req.headers["x-refresh-token"] as string;

  const context: Context = {
    res,
  };

  if (!token) return context;

  try {
    context.user = verify(token, secret) as Context["user"];
  } catch (error) {}

  return context;
};
