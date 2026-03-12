import { describe, expect, it } from "vitest";
import { formatRelativeTime } from "./ViewerFooterStatusBar";

describe("formatRelativeTime", () => {
	it("returns 'just now' for <10s", () => {
		const now = Date.now();
		expect(formatRelativeTime(new Date(now - 5 * 1000))).toBe("just now");
	});

	it("returns seconds for <60s", () => {
		const now = Date.now();
		expect(formatRelativeTime(new Date(now - 25 * 1000))).toBe("25s ago");
	});

	it("returns minutes for <60min", () => {
		const now = Date.now();
		expect(formatRelativeTime(new Date(now - 5 * 60 * 1000))).toBe("5 min ago");
		expect(formatRelativeTime(new Date(now - 59 * 60 * 1000))).toBe(
			"59 min ago",
		);
	});

	it("returns hours for >=60min", () => {
		const now = Date.now();
		expect(formatRelativeTime(new Date(now - 2 * 60 * 60 * 1000))).toBe(
			"2 hr ago",
		);
		expect(formatRelativeTime(new Date(now - 5 * 60 * 60 * 1000))).toBe(
			"5 hr ago",
		);
	});
});
