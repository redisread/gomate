import { createApiApp } from "../../lib/openapi";
import profile from "./profile";
import timeline from "./timeline";
import account from "./account";
import publicProfile from "./public-profile";

const usersRoute = createApiApp();
// Register self-service paths before the public /{id} route.
usersRoute.route("/", profile);
usersRoute.route("/", timeline);
usersRoute.route("/", account);
usersRoute.route("/", publicProfile);

export default usersRoute;
export { usersRoute };
