import { FetchHttpClient } from "@effect/platform/index";
import { Effect } from "effect";
import { useEffect, useRef, useState } from "react";
import { AnkiService, AnkiServiceLive } from "@/services/AnkiService";

export const useIsAnkiAvailable = () => {
	const [isConnected, setIsConnected] = useState<boolean | null>(null);
	const timeoutRef = useRef<NodeJS.Timeout | null>(null);

	useEffect(() => {
		if (!timeoutRef.current) {
			timeoutRef.current = setInterval(async () => {
				const isConnected = await Effect.runPromise(
					Effect.gen(function* () {
						const ankiService = yield* AnkiService;
						return yield* ankiService.isAvailable();
					}).pipe(
						Effect.catchAll(() => Effect.succeed(false)),
						Effect.provide(AnkiServiceLive),
						Effect.provide(FetchHttpClient.layer),
					),
				);
				setIsConnected(isConnected);
			}, 1000);
		}
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
				timeoutRef.current = null;
			}
		};
	}, []);

	return { isConnected };
};
