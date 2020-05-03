import Model from "../../orm/Model";
import { defaultSchema } from "../../orm/columns";

export interface Model_User {
  id: number;
  createdAt: Date;
  updatedAt: Date | null;
  email: string;
  username: string;
  password: string;
}

export default new Model<Model_User>("users", {
  schema: {
    ...defaultSchema,
    email: {
      type: "VARCHAR(255)",
      required: true,
      unique: true,
    },
    username: {
      type: "VARCHAR(255)",
      required: true,
      unique: true,
    },
    password: {
      type: "VARCHAR(512)",
      required: true,
    },
  },
});
