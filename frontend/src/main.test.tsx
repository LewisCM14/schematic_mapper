import { describe, expect, it, vi } from "vitest";

// Hoist the mock so it is applied before main.tsx is imported
const renderMock = vi.fn();
vi.mock("react-dom/client", async (importOriginal) => {
	const actual = await importOriginal();
	const actualObj = typeof actual === "object" && actual !== null ? actual : {};
	return {
		...actualObj,
		createRoot: () => ({ render: renderMock }),
	};
});

describe("main.tsx", () => {
	beforeEach(() => {
		renderMock.mockClear();
	});

	it("throws if root element is missing", async () => {
		// Remove #root if present
		const root = document.getElementById("root");
		if (root) root.remove();
		// Clear module cache so import runs fresh
		vi.resetModules();
		// Expect import to throw
		await expect(() => import("./main")).rejects.toThrow(
			"Root element not found",
		);
	});

	it("renders app if root element exists", async () => {
		// Set up #root
		const root = document.createElement("div");
		root.id = "root";
		document.body.appendChild(root);
		vi.resetModules();
		await import("./main");
		expect(renderMock).toHaveBeenCalled();
		// Clean up
		root.remove();
	});
});
