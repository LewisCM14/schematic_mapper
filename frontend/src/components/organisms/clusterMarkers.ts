import type { CanvasMarker } from "./DiagramCanvasViewport";

export interface MarkerCluster {
	type: "cluster";
	id: string;
	x: number;
	y: number;
	count: number;
	markerIds: string[];
}

export interface SingleMarker {
	type: "single";
	marker: CanvasMarker;
}

export type ClusterOrMarker = MarkerCluster | SingleMarker;

/**
 * Groups nearby markers into clusters using a grid-based spatial hash.
 *
 * Divides coordinates into square cells of size `threshold / scale` and
 * assigns each marker to a cell. Markers in the same cell form a cluster.
 * Runs in O(n) time regardless of marker count or cluster density.
 */
export function clusterMarkers(
	markers: CanvasMarker[],
	scale: number,
	threshold = 40,
): ClusterOrMarker[] {
	if (markers.length === 0) return [];

	const cellSize = threshold / scale;

	const cells = new Map<
		string,
		{ ids: string[]; markers: CanvasMarker[]; sumX: number; sumY: number }
	>();

	for (const marker of markers) {
		const col = Math.floor(marker.x / cellSize);
		const row = Math.floor(marker.y / cellSize);
		const key = `${col}:${row}`;
		let cell = cells.get(key);
		if (!cell) {
			cell = { ids: [], markers: [], sumX: 0, sumY: 0 };
			cells.set(key, cell);
		}
		cell.ids.push(marker.id);
		cell.markers.push(marker);
		cell.sumX += marker.x;
		cell.sumY += marker.y;
	}

	const result: ClusterOrMarker[] = [];
	for (const cell of cells.values()) {
		if (cell.markers.length === 1) {
			result.push({ type: "single", marker: cell.markers[0] });
		} else {
			result.push({
				type: "cluster",
				id: `cluster-${cell.ids.join("-")}`,
				x: Math.round(cell.sumX / cell.markers.length),
				y: Math.round(cell.sumY / cell.markers.length),
				count: cell.markers.length,
				markerIds: cell.ids,
			});
		}
	}
	return result;
}
