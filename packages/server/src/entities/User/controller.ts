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

type RefreshedTokenData = [
  Context["user"] | null,
  string | null,
  string | null
];

export const refreshTokens = async (
  refreshToken: string
): Promise<RefreshedTokenData> => {
  let user = null;

  try {
    const decoded = decode(refreshToken) as {
      id: number;
      iat: number;
      exp: number;
    };

    const _user = await db.models.User.findById({
      id: decoded.id,
      select: "id, username, password",
    });

    if (!_user) return [null, null, null];

    await verify(refreshToken, `${REFRESH_SECRET}${_user.password}`);

    const [newToken, newRefreshToken] = await createTokens(_user);

    // if refresh token is valid, pass user to context
    user = {
      id: _user.id.toString(),
      username: _user.username,
    };

    return [user, newToken, newRefreshToken];
  } catch (_error) {
    return [null, null, null];
  }
};
