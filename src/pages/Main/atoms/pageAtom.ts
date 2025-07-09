import { createAtom } from "@xstate/store";

export const pageAtom = createAtom<number | null>(null);
