import { decode, sign, verify } from "jsonwebtoken";
import { REFRESH_SECRET, TOKEN_SECRET } from "../../config";
import db from "../../db";
import { Context } from "../../middleware";

export const createTokens = ({
  id,
  username,
  password,
}: {
  id: number;
  username: string;
  password: string;
}) => {
  /* prettier-ignore */
  const tokenPromise = sign({ id, username }, TOKEN_SECRET, { expiresIn: "15m" });

  /* prettier-ignore */
  const refreshTokenPromise = sign({ id }, `${REFRESH_SECRET}${password}`, { expiresIn: "7d" });

  return Promise.all([tokenPromise, refreshTokenPromise]);
};

type RefreshedTokenData = [Context["user"], string, string] | null;

export const refreshTokens = async (
  refreshToken: string
): Promise<RefreshedTokenData> => {
  let user = null;

  try {
    // decode (not verify) the refreshToken
    const decoded = decode(refreshToken) as {
      id: number;
      iat: number;
      exp: number;
    };

    // ensure the user still exists
    const _user = await db.models.User.findById({
      id: decoded.id,
      select: "id, username, password",
    });

    // user no longer exists
    if (!_user) return null;

    // new that we have the password, we can check if the refreshToken is valid
    await verify(refreshToken, `${REFRESH_SECRET}${_user.password}`);

    // issue new tokens
    const [newToken, newRefreshToken] = await createTokens(_user);

    // pass user to context
    user = {
      id: _user.id.toString(),
      username: _user.username,
    };

    return [user, newToken, newRefreshToken];
  } catch (_error) {}

  return null;
};
