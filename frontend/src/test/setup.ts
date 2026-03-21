/**
 * setup.ts
 *
 * Global test setup for the Schematic Mapper frontend (Jest + Testing Library).
 *
 * - Extends Jest's expect with custom DOM matchers from @testing-library/jest-dom.
 * - Sets up and tears down the MSW (Mock Service Worker) server for API mocking.
 * - Ensures all unhandled requests in tests throw errors (to catch missing handlers).
 *
 * This file is automatically run before all test files (configured in jest setupFilesAfterEnv).
 */
import "@testing-library/jest-dom";
import { server } from "./handlers";

// Start the MSW server before all tests, error on unhandled requests
beforeAll(() =>
	server.listen({
		onUnhandledRequest(request) {
			// Log unhandled requests for debugging
			console.error(
				`[MSW][UNHANDLED] ${request.method} ${request.url.toString()}`,
			);
			// Optionally, throw to fail the test as before
			throw new Error(
				`[MSW] Unhandled ${request.method} request to ${request.url.toString()}`,
			);
		},
	}),
);

// Reset any request handlers that are declared as a part of our tests (so they don't affect other tests)
afterEach(() => server.resetHandlers());

// Clean up and shut down the MSW server after all tests are done
afterAll(() => server.close());
