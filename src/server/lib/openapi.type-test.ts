import {
  createApiApp,
  createRoute,
  jsonResponse,
  errorResponses,
  validationHook,
  z,
} from "./openapi";

/** Compile-only assertions: contracts reject incorrect wire responses without casting. */
export function verifyOpenApiContractTypes() {
  const app = createApiApp();
  const route = createRoute({
    method: "get",
    path: "/typed",
    request: { query: z.object({ name: z.string() }) },
    responses: {
      200: jsonResponse(z.object({ name: z.string() }), "Name"),
      ...errorResponses(400),
    },
  });
  app.openapi(
    route,
    (c) => c.json({ name: c.req.valid("query").name }, 200),
    validationHook("Invalid name"),
  );
  // @ts-expect-error A successful response cannot omit its required field.
  app.openapi(route, (c) => c.json({ wrong: true }, 200));
  // @ts-expect-error An undeclared success status must not bypass the contract.
  app.openapi(route, (c) => c.json({ name: "Ada" }, 201));
}
