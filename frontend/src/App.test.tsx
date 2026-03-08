import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import * as healthApi from "./services/api/health";

function renderWithClient(ui: React.ReactElement) {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return render(
		<QueryClientProvider client={client}>{ui}</QueryClientProvider>,
	);
}

describe("App", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it("shows success chips when API returns ok", async () => {
		vi.spyOn(healthApi, "fetchHealth").mockResolvedValue({
			status: "ok",
			database: "ok",
		});

		renderWithClient(<App />);

		await waitFor(() => {
			expect(screen.getByText("API: ok")).toBeInTheDocument();
			expect(screen.getByText("Database: ok")).toBeInTheDocument();
		});
	});

	it("shows error chip when API is unreachable", async () => {
		vi.spyOn(healthApi, "fetchHealth").mockRejectedValue(
			new Error("Network Error"),
		);

		renderWithClient(<App />);

		await waitFor(() => {
			expect(screen.getByText("API Unreachable")).toBeInTheDocument();
		});
	});
});
