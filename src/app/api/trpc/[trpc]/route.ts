import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { type NextRequest } from "next/server";

import { env } from "~/env";
import { appRouter } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a HTTP request (e.g. when you make requests from Client Components).
 */
const createContext = async (req: NextRequest) => {
  return createTRPCContext({
    headers: req.headers,
  });
};

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createContext(req),
    onError:
      env.NODE_ENV === "development"
        ? ({ path, error }) => {
            console.error(
              `❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`,
            );
          }
        : undefined,

    // TO-DO : Caching queries -- https://trpc.io/docs/server/caching
    // Below is a modified/simplified version we created then commented out.
    // Be sure to invalidate mutations (just to be safe).

    // responseMeta(opts) {
    //   const { errors, type } = opts;
    //   // checking that no procedures errored
    //   const allOk = errors.length === 0;
    //   // checking we're doing a query request
    //   const isQuery = type === "query";
    //   // Modified!
    //   if (allOk && isQuery) {
    //     // cache request for 1 day + revalidate once every second
    //     const ONE_DAY_IN_SECONDS = 60 * 60 * 24;
    //     return {
    //       headers: new Headers([
    //         [
    //           "cache-control",
    //           `s-maxage=1, stale-while-revalidate=${ONE_DAY_IN_SECONDS}`,
    //         ],
    //       ]),
    //     };
    //   }
    //   return {};
    // },
  });

export { handler as GET, handler as POST };
