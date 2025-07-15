import { createAtom } from "@xstate/store";
import type { Session } from "../../../domain/session/schema";

export const sessionIdAtom = createAtom<Session["id"] | null>(null);