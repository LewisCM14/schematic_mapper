import { describe, expect, it } from "vitest";
import { clusterMarkers } from "./clusterMarkers";
import type { CanvasMarker } from "./DiagramCanvasViewport";

describe("clusterMarkers", () => {
	it("returns empty array for no markers", () => {
		expect(clusterMarkers([], 1)).toEqual([]);
	});

	it("returns individual markers when they are far apart", () => {
		const markers: CanvasMarker[] = [
			{ id: "A", x: 0, y: 0, status: "mapped" },
			{ id: "B", x: 500, y: 500, status: "mapped" },
		];
		const result = clusterMarkers(markers, 1, 40);
		expect(result).toHaveLength(2);
		expect(result[0].type).toBe("single");
		expect(result[1].type).toBe("single");
	});

	it("clusters nearby markers together", () => {
		const markers: CanvasMarker[] = [
			{ id: "A", x: 100, y: 100, status: "mapped" },
			{ id: "B", x: 110, y: 110, status: "mapped" },
			{ id: "C", x: 105, y: 105, status: "mapped" },
		];
		const result = clusterMarkers(markers, 1, 40);
		expect(result).toHaveLength(1);
		expect(result[0].type).toBe("cluster");
		if (result[0].type === "cluster") {
			expect(result[0].count).toBe(3);
			expect(result[0].markerIds).toEqual(["A", "B", "C"]);
		}
	});

	it("adjusts clustering based on zoom scale", () => {
		const markers: CanvasMarker[] = [
			{ id: "A", x: 100, y: 100, status: "mapped" },
			{ id: "B", x: 130, y: 100, status: "mapped" },
		];
		// At scale 1, distance 30 < threshold 40 → clustered
		const clustered = clusterMarkers(markers, 1, 40);
		expect(clustered).toHaveLength(1);
		expect(clustered[0].type).toBe("cluster");

		// At scale 2, effective threshold = 20, distance 30 > 20 → separate
		const separate = clusterMarkers(markers, 2, 40);
		expect(separate).toHaveLength(2);
		expect(separate[0].type).toBe("single");
		expect(separate[1].type).toBe("single");
	});

	it("returns a single marker as a single, not a cluster", () => {
		const markers: CanvasMarker[] = [
			{ id: "A", x: 100, y: 100, status: "mapped" },
		];
		const result = clusterMarkers(markers, 1, 40);
		expect(result).toHaveLength(1);
		expect(result[0].type).toBe("single");
	});
});
