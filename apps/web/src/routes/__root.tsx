import type { QueryClient } from "@tanstack/react-query";
import { HeadContent, Outlet, createRootRouteWithContext } from "@tanstack/react-router";
export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({ meta: [{ title: "MUSE · 灵感收藏馆" }] }),
  component: () => (
    <>
      <HeadContent />
      <Outlet />
    </>
  ),
});
