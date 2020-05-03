import { Context } from "../middleware";
import { AuthenticationError } from "apollo-server";

type Permissions = "LOGGED_IN";

const admins: string[] = JSON.parse(process.env.ADMIN_LIST || "[]");

export default function restrict<F extends (...args: any[]) => any>(
  permission: Permissions,
  fn: F
): F {
  return <F>function (...args: any[]) {
    const context: Context = args[2];
    const user: Context["user"] = context?.user;

    if (!user?.id) {
      throw new AuthenticationError(
        "You must be logged in to use this feature"
      );
    }

    return fn(...args);
  };
}
