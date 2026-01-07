import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { apiRequest as sharedApiRequest, APIError } from "@/lib/api";

type UnauthorizedBehavior = "returnNull" | "throw";

export const getQueryFn: <T>(options: { on401: UnauthorizedBehavior }) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
    async ({ queryKey }) => {
      try {
        const data = await sharedApiRequest<any>(queryKey.join("/"));
        return data as any;
      } catch (err: any) {
        if (unauthorizedBehavior === "returnNull" && err instanceof APIError && err.statusCode === 401) {
          return null as any;
        }
        throw err;
      }
    };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
