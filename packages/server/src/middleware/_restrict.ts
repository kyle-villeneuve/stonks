import { AuthenticationError } from "apollo-server";
import { Context } from ".";
import { SUPER_USER_ID } from "../config";

type Permissions = "LOGGED_IN" | "SUPER_USER";

export default function restrict<F extends (...args: any[]) => any>(
  permission: Permissions,
  fn: F
): F {
  return <F>function (...args: any[]) {
    const context: Context = args[2];
    const user: Context["user"] = context?.user;

    if (!user.id) {
      throw new AuthenticationError(
        "You must be logged in to use this feature"
      );
    }

    switch (permission) {
      case "SUPER_USER": {
        if (user.id.toString() !== SUPER_USER_ID) {
          throw new AuthenticationError(
            "You don't have permission to use this feature"
          );
        }
      }
    }

    return fn(...args);
  };
}
