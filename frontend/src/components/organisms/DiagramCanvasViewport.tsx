// --- Filtering utilities for testable coverage ---
export interface ViewportRect {
	left: number;
	top: number;
	right: number;
	bottom: number;
}

export function filterRectanglesByViewport(
	rectangles: CanvasRectangle[],
	viewport: ViewportRect | null,
): CanvasRectangle[] {
	if (!viewport) return rectangles;
	return rectangles.filter((rectangle) => {
		const right = rectangle.x + rectangle.width;
		const bottom = rectangle.y + rectangle.height;
		return (
			right >= viewport.left &&
			rectangle.x <= viewport.right &&
			bottom >= viewport.top &&
			rectangle.y <= viewport.bottom
		);
	});
}

import type { ClusterOrMarker } from "./clusterMarkers";

export function filterMarkersByViewport(
	items: ClusterOrMarker[],
	viewport: ViewportRect | null,
): ClusterOrMarker[] {
	if (!viewport) return items;
	return items.filter((item) => {
		const x = item.type === "cluster" ? item.x : item.marker.x;
		const y = item.type === "cluster" ? item.y : item.marker.y;
		return (
			x >= viewport.left &&
			x <= viewport.right &&
			y >= viewport.top &&
			y <= viewport.bottom
		);
	});
}

import RestartAltIcon from "@mui/icons-material/RestartAlt";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import { Box, IconButton } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import Panzoom, { type PanzoomObject } from "@panzoom/panzoom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import IconButtonAction from "../atoms/IconButtonAction";
import POIMarkerCluster from "../atoms/POIMarkerCluster";
import POIMarkerPin from "../atoms/POIMarkerPin";
import { clusterMarkers } from "./clusterMarkers";

export interface CanvasMarker {
	id: string;
	x: number;
	y: number;
	status: "mapped" | "unmapped";
}

export interface CanvasRectangle {
	id: string;
	x: number;
	y: number;
	width: number;
	height: number;
	status: "mapped" | "unmapped";
}

export interface DiagramCanvasViewportProps {
	imageSvgUrl: string;
	markers: CanvasMarker[];
	rectangles?: CanvasRectangle[];
	showMappedRectangles?: boolean;
	interactiveMappedRectangles?: boolean;
	pinnedTooltipId?: string | null;
	pinnedTooltipContent?: React.ReactNode;
	requestedZoomScale?: number | null;
	draftRectangle?: CanvasRectangle | null;
	interactionMode?: "pan" | "draw";
	onMarkerClick?: (id: string) => void;
	onCanvasClick?: (x: number, y: number) => void;
	onMarkerDrag?: (id: string, x: number, y: number) => void;
	onRectangleDraw?: (rectangle: {
		x: number;
		y: number;
		width: number;
		height: number;
	}) => void;
	panToTarget?: { x: number; y: number } | null;
	/** When provided, called on every panzoom scale change */
	onZoomChange?: (scale: number) => void;
	/** Optional ID of the currently-selected marker */
	selectedMarkerId?: string | null;
	/** Wrap each marker button in a tooltip or other element */
	renderMarkerWrapper?: (
		markerId: string,
		children: React.ReactElement,
	) => React.ReactNode;
}

/** Pixel-distance threshold used for marker clustering. */
const CLUSTER_THRESHOLD = 40;

/** Extra pixels around the visible viewport to render (avoids pop-in during fast pans). */
const VIEWPORT_BUFFER = 100;

/** Viewport rectangle in image-space coordinates. */
export interface ViewportRect {
	left: number;
	top: number;
	right: number;
	bottom: number;
}

function DiagramCanvasViewport({
	imageSvgUrl,
	markers,
	rectangles = [],
	showMappedRectangles = true,
	interactiveMappedRectangles = false,
	pinnedTooltipId = null,
	pinnedTooltipContent,
	requestedZoomScale = null,
	draftRectangle = null,
	interactionMode: interactionModeProp,
	onMarkerClick,
	onCanvasClick,
	onMarkerDrag,
	onRectangleDraw,
	panToTarget,
	onZoomChange,
	selectedMarkerId,
	renderMarkerWrapper,
}: DiagramCanvasViewportProps) {
	const theme = useTheme();
	const containerRef = useRef<HTMLDivElement>(null);
	const imgRef = useRef<HTMLImageElement>(null);
	const [panZoomHost, setPanZoomHost] = useState<HTMLDivElement | null>(null);
	const panzoomRef = useRef<PanzoomObject | null>(null);
	const fitScaleRef = useRef(1);
	const [currentScale, setCurrentScale] = useState(1);
	const [viewport, setViewport] = useState<ViewportRect | null>(null);
	const rafRef = useRef(0);
	const fitRafRef = useRef(0);
	const lastAppliedRequestedZoomRef = useRef<number | null>(null);
	const [imageReady, setImageReady] = useState(false);

	// Drag state
	const dragRef = useRef<{
		id: string;
		startX: number;
		startY: number;
		originX: number;
		originY: number;
	} | null>(null);
	const drawRef = useRef<{ startX: number; startY: number } | null>(null);
	const [liveRectangle, setLiveRectangle] = useState<CanvasRectangle | null>(
		null,
	);
	const interactionMode =
		interactionModeProp ?? (onRectangleDraw ? "draw" : "pan");
	const isDrawMode = interactionMode === "draw";
	const isDrawModeRef = useRef(isDrawMode);

	useEffect(() => {
		isDrawModeRef.current = isDrawMode;
	}, [isDrawMode]);

	// Compute the scale that fits the image inside the container and centre it
	const zoomToFit = useCallback(() => {
		const pz = panzoomRef.current;
		const container = containerRef.current;
		const img = imgRef.current;
		if (!pz || !container || !img) return;
		const cw = container.clientWidth;
		const ch = container.clientHeight;
		const iw = img.naturalWidth || img.clientWidth;
		const ih = img.naturalHeight || img.clientHeight;
		if (!iw || !ih || !cw || !ch) return;
		const fitScale = Math.min(cw / iw, ch / ih);
		fitScaleRef.current = fitScale;
		const panX = (cw / fitScale - iw) / 2;
		const panY = (ch / fitScale - ih) / 2;
		pz.setOptions({
			minScale: fitScale,
			startScale: fitScale,
			startX: panX,
			startY: panY,
		});
		pz.reset({ animate: false, force: true });
	}, []);

	const scheduleZoomToFit = useCallback(() => {
		if (fitRafRef.current) cancelAnimationFrame(fitRafRef.current);
		fitRafRef.current = requestAnimationFrame(() => {
			fitRafRef.current = requestAnimationFrame(() => {
				zoomToFit();
				fitRafRef.current = 0;
			});
		});
	}, [zoomToFit]);

	// Initialise Panzoom
	useEffect(() => {
		if (!panZoomHost) return;
		const pz = Panzoom(panZoomHost, {
			origin: "0 0",
			minScale: 0.1,
			maxScale: 10,
			cursor: "inherit",
			noBind: true,
		});
		panzoomRef.current = pz;
		// Panzoom sets an inline cursor style that overrides the sx prop.
		// Clear it so the React-managed cursor (crosshair / grab) wins.
		panZoomHost.style.cursor = "";
		const container = containerRef.current;
		container?.addEventListener("wheel", pz.zoomWithWheel);

		const addPointerListeners = (
			element: EventTarget,
			eventNames: string,
			handler: EventListener,
			options?: AddEventListenerOptions,
		) => {
			eventNames.split(" ").forEach((eventName) => {
				element.addEventListener(eventName, handler, options);
			});
		};

		const removePointerListeners = (
			element: EventTarget,
			eventNames: string,
			handler: EventListener,
		) => {
			eventNames.split(" ").forEach((eventName) => {
				element.removeEventListener(eventName, handler);
			});
		};

		const handlePanzoomPointerDown: EventListener = (event) => {
			if (isDrawModeRef.current) {
				return;
			}
			pz.handleDown(event as PointerEvent);
		};

		addPointerListeners(
			panZoomHost,
			pz.eventNames.down,
			handlePanzoomPointerDown,
		);
		addPointerListeners(
			document,
			pz.eventNames.move,
			pz.handleMove as EventListener,
			{
				passive: true,
			},
		);
		addPointerListeners(
			document,
			pz.eventNames.up,
			pz.handleUp as EventListener,
			{
				passive: true,
			},
		);

		const updateViewport = () => {
			if (!container) return;
			const scale = pz.getScale();
			const pan = pz.getPan();
			const w = container.clientWidth;
			const h = container.clientHeight;
			// Skip culling when the container has no layout (e.g. jsdom)
			if (w === 0 && h === 0) {
				setViewport(null);
				return;
			}
			setViewport({
				left: -pan.x / scale - VIEWPORT_BUFFER / scale,
				top: -pan.y / scale - VIEWPORT_BUFFER / scale,
				right: (-pan.x + w) / scale + VIEWPORT_BUFFER / scale,
				bottom: (-pan.y + h) / scale + VIEWPORT_BUFFER / scale,
			});
		};

		const onPanzoomChange = () => {
			const fitScale = fitScaleRef.current || 1;
			onZoomChange?.(pz.getScale() / fitScale);
			// Gate scale + viewport updates to one per animation frame
			if (rafRef.current) cancelAnimationFrame(rafRef.current);
			rafRef.current = requestAnimationFrame(() => {
				setCurrentScale(pz.getScale());
				updateViewport();
				rafRef.current = 0;
			});
		};

		panZoomHost.addEventListener("panzoomchange", onPanzoomChange);
		// Set initial viewport
		updateViewport();

		return () => {
			if (rafRef.current) cancelAnimationFrame(rafRef.current);
			if (fitRafRef.current) cancelAnimationFrame(fitRafRef.current);
			pz.destroy();
			container?.removeEventListener("wheel", pz.zoomWithWheel);
			removePointerListeners(
				panZoomHost,
				pz.eventNames.down,
				handlePanzoomPointerDown,
			);
			removePointerListeners(
				document,
				pz.eventNames.move,
				pz.handleMove as EventListener,
			);
			removePointerListeners(
				document,
				pz.eventNames.up,
				pz.handleUp as EventListener,
			);
			panZoomHost.removeEventListener("panzoomchange", onPanzoomChange);
			panzoomRef.current = null;
		};
	}, [panZoomHost, onZoomChange]);

	useEffect(() => {
		setImageReady(false);
	}, []);

	useEffect(() => {
		const img = imgRef.current;
		if (!img || !panZoomHost) return;
		if (imageReady || img.complete) {
			scheduleZoomToFit();
		}
	}, [imageReady, panZoomHost, scheduleZoomToFit]);

	// Compute clustered markers, then cull to viewport
	const clusteredItems = useMemo(
		() => clusterMarkers(markers, currentScale, CLUSTER_THRESHOLD),
		[markers, currentScale],
	);

	const visibleItems = useMemo(
		() => filterMarkersByViewport(clusteredItems, viewport),
		[clusteredItems, viewport],
	);

	const visibleRectangles = useMemo(() => {
		const allRectangles = [
			...rectangles,
			...(draftRectangle ? [draftRectangle] : []),
			...(liveRectangle ? [liveRectangle] : []),
		];
		return filterRectanglesByViewport(allRectangles, viewport);
	}, [draftRectangle, liveRectangle, rectangles, viewport]);

	const visibleInteractiveRectangles = useMemo(
		() =>
			interactiveMappedRectangles
				? visibleRectangles.filter(
						(rectangle) =>
							rectangle.status === "mapped" &&
							rectangle.width > 0 &&
							rectangle.height > 0,
					)
				: [],
		[interactiveMappedRectangles, visibleRectangles],
	);

	const pinnedTooltipTarget = useMemo(() => {
		if (!pinnedTooltipId) return null;
		const rectangle = rectangles.find((item) => item.id === pinnedTooltipId);
		if (rectangle) {
			return {
				x: rectangle.x + Math.min(rectangle.width * 0.18, 18),
				y: rectangle.y + Math.min(rectangle.height * 0.18, 18),
				transform: "translate(calc(-100% - 8px), calc(-100% - 8px))",
			};
		}
		const marker = markers.find((item) => item.id === pinnedTooltipId);
		if (marker) {
			return {
				x: marker.x,
				y: marker.y,
				transform: "translate(calc(-100% - 8px), calc(-100% - 8px))",
			};
		}
		return null;
	}, [markers, pinnedTooltipId, rectangles]);

	useEffect(() => {
		if (requestedZoomScale == null) {
			lastAppliedRequestedZoomRef.current = null;
			return;
		}
		if (!imageReady) return;
		const pz = panzoomRef.current;
		if (!pz) return;
		const nextZoom = Number(requestedZoomScale);
		if (!Number.isFinite(nextZoom) || nextZoom <= 0) return;
		const fitScale = fitScaleRef.current || 1;
		const targetScale = fitScale * nextZoom;
		const currentZoom = pz.getScale() / fitScale;
		if (Math.abs(currentZoom - nextZoom) < 0.01) {
			lastAppliedRequestedZoomRef.current = nextZoom;
			return;
		}
		if (
			lastAppliedRequestedZoomRef.current != null &&
			Math.abs(lastAppliedRequestedZoomRef.current - nextZoom) < 0.0001
		) {
			return;
		}
		pz.zoom(targetScale, { animate: false, force: true });
		lastAppliedRequestedZoomRef.current = nextZoom;
	}, [imageReady, requestedZoomScale]);

	// Programmatic pan
	useEffect(() => {
		if (!panToTarget) return;
		const pz = panzoomRef.current;
		const container = containerRef.current;
		if (!pz || !container) return;
		const scale = pz.getScale();
		const panX = container.clientWidth / (2 * scale) - panToTarget.x;
		const panY = container.clientHeight / (2 * scale) - panToTarget.y;
		pz.pan(panX, panY);
	}, [panToTarget]);

	const handleCanvasClick = useCallback(
		(e: React.MouseEvent<HTMLDivElement>) => {
			if (isDrawMode) return;
			if (!onCanvasClick || !panZoomHost) return;
			// Only fire if click is on the host itself (not on a marker)
			if (e.target !== panZoomHost && !(e.target instanceof HTMLImageElement))
				return;
			const rect = panZoomHost.getBoundingClientRect();
			const pz = panzoomRef.current;
			const scale = pz ? pz.getScale() : 1;
			const x = Math.round((e.clientX - rect.left) / scale);
			const y = Math.round((e.clientY - rect.top) / scale);
			onCanvasClick(x, y);
		},
		[isDrawMode, onCanvasClick, panZoomHost],
	);

	const getCanvasCoordinates = useCallback(
		(clientX: number, clientY: number) => {
			if (!panZoomHost) return null;
			const rect = panZoomHost.getBoundingClientRect();
			const pz = panzoomRef.current;
			const scale = pz ? pz.getScale() : 1;
			return {
				x: Math.round((clientX - rect.left) / scale),
				y: Math.round((clientY - rect.top) / scale),
			};
		},
		[panZoomHost],
	);

	// Drag handlers for markers
	const handlePointerDown = useCallback(
		(markerId: string, e: React.PointerEvent) => {
			if (!onMarkerDrag) return;
			e.preventDefault();
			e.stopPropagation();
			(e.target as HTMLElement).setPointerCapture(e.pointerId);
			// Disable panzoom while dragging
			panzoomRef.current?.setOptions({ disablePan: true });
			const marker = markers.find((m) => m.id === markerId);
			if (!marker) return;
			dragRef.current = {
				id: markerId,
				startX: e.clientX,
				startY: e.clientY,
				originX: marker.x,
				originY: marker.y,
			};
		},
		[onMarkerDrag, markers],
	);

	const handlePointerMove = useCallback(
		(e: React.PointerEvent) => {
			if (drawRef.current) {
				const current = getCanvasCoordinates(e.clientX, e.clientY);
				if (!current) return;
				setLiveRectangle({
					id: "__drawing__",
					x: Math.min(drawRef.current.startX, current.x),
					y: Math.min(drawRef.current.startY, current.y),
					width: Math.abs(current.x - drawRef.current.startX),
					height: Math.abs(current.y - drawRef.current.startY),
					status: "unmapped",
				});
				return;
			}
			if (!dragRef.current || !onMarkerDrag) return;
			const pz = panzoomRef.current;
			const scale = pz ? pz.getScale() : 1;
			const dx = (e.clientX - dragRef.current.startX) / scale;
			const dy = (e.clientY - dragRef.current.startY) / scale;
			onMarkerDrag(
				dragRef.current.id,
				Math.round(dragRef.current.originX + dx),
				Math.round(dragRef.current.originY + dy),
			);
		},
		[getCanvasCoordinates, onMarkerDrag],
	);

	const handlePointerUp = useCallback(
		(e: React.PointerEvent) => {
			if (drawRef.current) {
				const current = getCanvasCoordinates(e.clientX, e.clientY);
				const completedRectangle = current
					? {
							x: Math.min(drawRef.current.startX, current.x),
							y: Math.min(drawRef.current.startY, current.y),
							width: Math.abs(current.x - drawRef.current.startX),
							height: Math.abs(current.y - drawRef.current.startY),
						}
					: liveRectangle
						? {
								x: liveRectangle.x,
								y: liveRectangle.y,
								width: liveRectangle.width,
								height: liveRectangle.height,
							}
						: null;
				if (
					completedRectangle &&
					completedRectangle.width >= 4 &&
					completedRectangle.height >= 4
				) {
					onRectangleDraw?.({
						x: completedRectangle.x,
						y: completedRectangle.y,
						width: completedRectangle.width,
						height: completedRectangle.height,
					});
				}
				drawRef.current = null;
				setLiveRectangle(null);
				return;
			}
			if (dragRef.current) {
				dragRef.current = null;
				panzoomRef.current?.setOptions({ disablePan: false });
			}
		},
		[getCanvasCoordinates, liveRectangle, onRectangleDraw],
	);

	const handleViewportPointerDown = useCallback(
		(e: React.PointerEvent<HTMLDivElement>) => {
			if (!onRectangleDraw || !isDrawMode) return;
			if (e.target !== panZoomHost && !(e.target instanceof HTMLImageElement))
				return;
			e.preventDefault();
			e.stopPropagation();
			const coords = getCanvasCoordinates(e.clientX, e.clientY);
			if (!coords) return;
			drawRef.current = { startX: coords.x, startY: coords.y };
			setLiveRectangle({
				id: "__drawing__",
				x: coords.x,
				y: coords.y,
				width: 0,
				height: 0,
				status: "unmapped",
			});
		},
		[getCanvasCoordinates, isDrawMode, onRectangleDraw, panZoomHost],
	);

	useEffect(() => {
		return () => {
			if (fitRafRef.current) cancelAnimationFrame(fitRafRef.current);
		};
	}, []);

	return (
		<Box
			ref={containerRef}
			sx={{
				position: "relative",
				overflow: "hidden",
				border: "1px solid",
				borderColor: theme.palette.map.grid.line,
				borderRadius: 1,
				width: "100%",
				height: "70vh",
				background: theme.palette.map.canvas.bg,
			}}
			data-testid="diagram-canvas"
		>
			<Box
				sx={{
					position: "absolute",
					top: 8,
					right: 8,
					zIndex: 10,
					display: "flex",
					flexDirection: "column",
					gap: 0.5,
					background: `color-mix(in srgb, ${theme.palette.background.paper} 85%, transparent)`,
					borderRadius: 1,
					p: 0.5,
				}}
			>
				<IconButtonAction
					icon={<ZoomInIcon fontSize="small" />}
					onClick={() => panzoomRef.current?.zoomIn()}
					ariaLabel="zoom in"
					tooltip="Zoom in"
				/>
				<IconButtonAction
					icon={<ZoomOutIcon fontSize="small" />}
					onClick={() => panzoomRef.current?.zoomOut()}
					ariaLabel="zoom out"
					tooltip="Zoom out"
				/>
				<IconButtonAction
					icon={<RestartAltIcon fontSize="small" />}
					onClick={zoomToFit}
					ariaLabel="reset view"
					tooltip="Reset view"
				/>
			</Box>

			{/* Panzoom host — wraps SVG image and markers together */}
			<Box
				ref={setPanZoomHost}
				onPointerDown={handleViewportPointerDown}
				onClick={handleCanvasClick}
				onPointerMove={handlePointerMove}
				onPointerUp={handlePointerUp}
				sx={{
					position: "relative",
					display: "inline-block",
					transformOrigin: "0 0",
					cursor: isDrawMode || onCanvasClick ? "crosshair" : "move",
					"&:active": {
						cursor: isDrawMode || onCanvasClick ? "crosshair" : "move",
					},
					userSelect: "none",
				}}
			>
				{/* SVG schematic */}
				<Box
					component="img"
					ref={imgRef}
					src={imageSvgUrl}
					alt="schematic diagram"
					sx={{ display: "block" }}
					draggable={false}
					onLoad={() => {
						setImageReady(true);
						scheduleZoomToFit();
					}}
				/>

				{visibleRectangles
					.filter(
						(rectangle) =>
							rectangle.status === "unmapped" || showMappedRectangles,
					)
					.map((rectangle) => {
						const isSelected = rectangle.id === selectedMarkerId;
						const rectangleColor =
							rectangle.status === "unmapped"
								? theme.palette.map.poi.unmapped
								: isSelected
									? theme.palette.map.poi.selected
									: theme.palette.map.poi.default;

						return (
							<Box
								key={rectangle.id}
								aria-label={`rectangle ${rectangle.id}`}
								data-testid={`rectangle-${rectangle.id}`}
								sx={{
									position: "absolute",
									left: rectangle.x,
									top: rectangle.y,
									width: rectangle.width,
									height: rectangle.height,
									border: `${isSelected ? 3 : 2}px solid`,
									borderColor: rectangleColor,
									borderStyle:
										rectangle.status === "unmapped" ? "dashed" : "solid",
									background: `color-mix(in srgb, ${rectangleColor} ${isSelected ? 22 : 12}%, transparent)`,
									boxSizing: "border-box",
									pointerEvents: "none",
								}}
							/>
						);
					})}

				{visibleInteractiveRectangles.map((rectangle) => {
					const button = (
						<Box
							key={`hitbox-${rectangle.id}`}
							component="button"
							type="button"
							className="panzoom-exclude"
							onClick={(e: React.MouseEvent) => {
								e.stopPropagation();
								onMarkerClick?.(rectangle.id);
							}}
							sx={{
								position: "absolute",
								left: rectangle.x,
								top: rectangle.y,
								width: rectangle.width,
								height: rectangle.height,
								transform: "none",
								padding: 0,
								margin: 0,
								border: 0,
								background: "transparent",
								opacity: 0,
								cursor: "pointer",
							}}
							aria-label={rectangle.id}
						/>
					);
					return renderMarkerWrapper
						? renderMarkerWrapper(rectangle.id, button)
						: button;
				})}

				{pinnedTooltipTarget && pinnedTooltipContent && (
					<Box
						role="tooltip"
						aria-label={`pinned tooltip ${pinnedTooltipId}`}
						sx={{
							position: "absolute",
							left: pinnedTooltipTarget.x,
							top: pinnedTooltipTarget.y,
							transform: pinnedTooltipTarget.transform,
							zIndex: 4,
							pointerEvents: "auto",
							maxWidth: "min(240px, calc(100vw - 64px))",
						}}
					>
						{pinnedTooltipContent}
					</Box>
				)}

				{/* Marker pins and clusters */}
				{visibleItems.map((item) => {
					if (item.type === "cluster") {
						return (
							<Box
								key={item.id}
								sx={{
									position: "absolute",
									left: item.x,
									top: item.y,
									transform: "translate(-50%, -50%)",
								}}
							>
								<POIMarkerCluster
									count={item.count}
									onClick={() => {
										// Zoom in toward cluster centroid to expand it
										panzoomRef.current?.zoomIn();
									}}
								/>
							</Box>
						);
					}

					const marker = item.marker;
					const isSelected = marker.id === selectedMarkerId;
					const isUnmapped = marker.status === "unmapped";
					const button = (
						<IconButton
							key={marker.id}
							className="panzoom-exclude"
							size="small"
							onClick={(e) => {
								e.stopPropagation();
								onMarkerClick?.(marker.id);
							}}
							onPointerDown={(e) => handlePointerDown(marker.id, e)}
							sx={{
								position: "absolute",
								left: marker.x,
								top: marker.y,
								transform: "translate(-50%, -100%)",
								padding: 0,
								"&:hover": { opacity: 0.8 },
								color: isUnmapped ? theme.palette.map.poi.unmapped : undefined,
							}}
							aria-label={marker.id}
						>
							<POIMarkerPin selected={isSelected} />
						</IconButton>
					);
					return renderMarkerWrapper
						? renderMarkerWrapper(marker.id, button)
						: button;
				})}
			</Box>
		</Box>
	);
}

export default DiagramCanvasViewport;
