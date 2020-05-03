import { sign } from "jsonwebtoken";

export const createTokens = ({
  id,
  username,
  password,
}: {
  id: number;
  username: string;
  password: string;
}) => {
  const tokenPromise = sign(
    {
      id,
      username,
    },
    process.env.TOKEN_SECRET as string,
    {
      expiresIn: "1d", // TODO: should actually be much shorter e.g. 15m
    }
  );

  const refreshTokenPromise = sign(
    { id },
    process.env.REFRESH_SECRET + password,
    {
      expiresIn: "7d",
    }
  );

  return Promise.all([tokenPromise, refreshTokenPromise]);
};
