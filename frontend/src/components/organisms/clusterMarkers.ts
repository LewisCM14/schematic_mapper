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
 * Groups nearby markers into clusters based on the current zoom scale
 * and a pixel-distance threshold.
 *
 * Uses a simple greedy algorithm: iterate through markers and assign each
 * to the nearest existing cluster within threshold, or start a new cluster.
 */
export function clusterMarkers(
	markers: CanvasMarker[],
	scale: number,
	threshold = 40,
): ClusterOrMarker[] {
	if (markers.length === 0) return [];

	// Effective distance threshold in image-space coordinates
	const effectiveThreshold = threshold / scale;

	const clusters: {
		cx: number;
		cy: number;
		ids: string[];
		markers: CanvasMarker[];
	}[] = [];

	for (const marker of markers) {
		let assigned = false;
		for (const cluster of clusters) {
			const dx = marker.x - cluster.cx;
			const dy = marker.y - cluster.cy;
			const dist = Math.sqrt(dx * dx + dy * dy);
			if (dist <= effectiveThreshold) {
				cluster.ids.push(marker.id);
				cluster.markers.push(marker);
				// Update centroid
				cluster.cx =
					cluster.markers.reduce((s, m) => s + m.x, 0) / cluster.markers.length;
				cluster.cy =
					cluster.markers.reduce((s, m) => s + m.y, 0) / cluster.markers.length;
				assigned = true;
				break;
			}
		}
		if (!assigned) {
			clusters.push({
				cx: marker.x,
				cy: marker.y,
				ids: [marker.id],
				markers: [marker],
			});
		}
	}

	return clusters.map((cluster) => {
		if (cluster.markers.length === 1) {
			return { type: "single", marker: cluster.markers[0] } as SingleMarker;
		}
		return {
			type: "cluster",
			id: `cluster-${cluster.ids.join("-")}`,
			x: Math.round(cluster.cx),
			y: Math.round(cluster.cy),
			count: cluster.markers.length,
			markerIds: cluster.ids,
		} as MarkerCluster;
	});
}
