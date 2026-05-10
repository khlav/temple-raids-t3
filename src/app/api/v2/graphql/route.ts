// src/app/api/v2/graphql/route.ts
import { createYoga } from "graphql-yoga";
import { schema } from "~/server/api/v2/schema";
import { buildContext } from "~/server/api/v2/context";

const { handleRequest } = createYoga({
  schema,
  context: buildContext,
  graphqlEndpoint: "/api/v2/graphql",
  graphiql: process.env.NODE_ENV === "development",
  fetchAPI: { Response },
});

export { handleRequest as GET, handleRequest as POST };
