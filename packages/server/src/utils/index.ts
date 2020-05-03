import { IError } from "../schema";

export const formatErrors = (error: any | any[]): IError[] => {
  if (!error) return [];

  const errors: any[] = Array.isArray(error) ? error : [error];

  return errors.reduce((all, error) => {
    switch (error.code) {
      // pg unique constraint violation
      case "23505": {
        const match: string[] = error.detail.match(/\([a-z0-9]+\)/im) || [];
        const field = match[0]?.slice(1, -1);

        const formatted = {
          field,
          message: `${field} already exists`,
        };

        return [...all, formatted];
      }

      default: {
        console.log(error);
        const formatted = {
          field: error.field,
          message: error.message,
        };

        return [...all, formatted];
      }
    }
  }, []);
};
