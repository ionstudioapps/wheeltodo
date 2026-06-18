import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  {
    test: {
      name: "shared",
      include: ["packages/shared/src/__tests__/**/*.test.ts"],
      environment: "node",
    },
  },
  {
    test: {
      name: "web",
      include: ["apps/web/src/**/__tests__/**/*.test.ts"],
      environment: "node",
    },
  },
  {
    test: {
      name: "edge-functions",
      include: ["supabase/functions/**/*.test.ts"],
      environment: "node",
    },
  },
]);
