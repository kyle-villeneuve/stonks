import DB from "../orm";
import User from "../entities/User/model";

export default new DB({
  extensions: [],
  models: {
    User,
  },
});
