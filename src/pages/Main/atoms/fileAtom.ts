import { createAtom } from "@xstate/store";

export const fileAtom = createAtom<{
	file: File;
	url: string;
} | null>(null);
