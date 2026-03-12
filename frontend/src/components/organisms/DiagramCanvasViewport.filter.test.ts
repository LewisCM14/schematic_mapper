import {
	filterMarkersByViewport,
	filterRectanglesByViewport,
	type ViewportRect,
} from "./DiagramCanvasViewport";

describe("filterRectanglesByViewport", () => {
	const viewport: ViewportRect = { left: 0, top: 0, right: 100, bottom: 100 };
	it("returns all rectangles if viewport is null", () => {
		const rects = [
			{
				id: "a",
				x: 10,
				y: 10,
				width: 10,
				height: 10,
				status: "mapped" as const,
			},
			{
				id: "b",
				x: 200,
				y: 200,
				width: 10,
				height: 10,
				status: "mapped" as const,
			},
		];
		expect(filterRectanglesByViewport(rects, null)).toEqual(rects);
	});
	it("filters rectangles outside viewport", () => {
		const rects = [
			{
				id: "in",
				x: 10,
				y: 10,
				width: 10,
				height: 10,
				status: "mapped" as const,
			},
			{
				id: "out",
				x: 200,
				y: 200,
				width: 10,
				height: 10,
				status: "mapped" as const,
			},
		];
		const filtered = filterRectanglesByViewport(rects, viewport);
		expect(filtered).toEqual([
			{ id: "in", x: 10, y: 10, width: 10, height: 10, status: "mapped" },
		]);
	});
});

describe("filterMarkersByViewport", () => {
	const viewport: ViewportRect = { left: 0, top: 0, right: 100, bottom: 100 };
	it("returns all items if viewport is null", () => {
		const items = [
			{
				type: "cluster" as const,
				x: 10,
				y: 10,
				id: "c",
				count: 2,
				markerIds: ["m1", "m2"],
			},
			{
				type: "single" as const,
				marker: { x: 200, y: 200, id: "m", status: "mapped" as const },
			},
		];
		expect(filterMarkersByViewport(items, null)).toEqual(items);
	});
	it("filters markers and clusters outside viewport", () => {
		const items = [
			{
				type: "cluster" as const,
				x: 10,
				y: 10,
				id: "c",
				count: 2,
				markerIds: ["m1", "m2"],
			},
			{
				type: "cluster" as const,
				x: 200,
				y: 200,
				id: "c2",
				count: 2,
				markerIds: ["m3", "m4"],
			},
			{
				type: "single" as const,
				marker: { x: 5, y: 5, id: "m1", status: "mapped" as const },
			},
			{
				type: "single" as const,
				marker: { x: 300, y: 300, id: "m2", status: "mapped" as const },
			},
		];
		const filtered = filterMarkersByViewport(items, viewport);
		expect(filtered).toEqual([
			{
				type: "cluster" as const,
				x: 10,
				y: 10,
				id: "c",
				count: 2,
				markerIds: ["m1", "m2"],
			},
			{
				type: "single" as const,
				marker: { x: 5, y: 5, id: "m1", status: "mapped" as const },
			},
		]);
	});
});
