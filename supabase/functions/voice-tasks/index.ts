import { callAnthropic, requireAuth } from "../_shared/anthropic.ts";
import { handleRequest } from "./logic.ts";

Deno.serve((req) => handleRequest(req, { requireAuth, callAnthropic }));
