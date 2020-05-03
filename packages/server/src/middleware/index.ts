import { Request, Response } from "express";
import { verify } from "jsonwebtoken";

export interface Context {
  user: {
    id?: string;
    username?: string;
  };
  res: Response;
}

export default ({ req, res }: { req: Request; res: Response }): Context => {
  const secret = process.env.TOKEN_SECRET as string;
  const token = req.headers["x-token"] as string;
  const refreshToken = req.headers["x-refresh-token"] as string;

  const context: Context = {
    res,
    user: {},
  };

  if (!token) return context;

  try {
    context.user = verify(token, secret) as Context["user"];
  } catch (error) {
    console.log(error);
  }

  console.log(context.user);

  return context;
};
