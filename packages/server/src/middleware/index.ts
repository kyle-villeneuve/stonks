import { Request, Response } from "express";

export interface Context {
  user?: {
    id: string;
  };
  res: Response;
}

export default ({ req, res }: { req: Request; res: Response }) => {
  // console.log(req);
  const token = req.headers["X-Token"];
  const refreshToken = req.headers["X-Refresh-Token"];

  return {
    res,
  };
};
