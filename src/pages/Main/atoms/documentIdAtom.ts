import { createAtom } from "@xstate/store";
import type { Document } from "../../../domain/document/schema";

export const documentIdAtom = createAtom<Document["id"] | null>(null);