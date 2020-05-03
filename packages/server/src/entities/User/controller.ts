import { sign } from "jsonwebtoken";
import { REFRESH_SECRET, TOKEN_SECRET } from "../../config";

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
    TOKEN_SECRET,
    {
      expiresIn: "1d", // TODO: should actually be much shorter e.g. 15m
    }
  );

  const refreshTokenPromise = sign({ id }, REFRESH_SECRET + password, {
    expiresIn: "7d",
  });

  return Promise.all([tokenPromise, refreshTokenPromise]);
};
