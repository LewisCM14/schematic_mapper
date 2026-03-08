import RestartAltIcon from "@mui/icons-material/RestartAlt";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import { Box, IconButton, Tooltip } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import Panzoom, { type PanzoomObject } from "@panzoom/panzoom";
import { useCallback, useEffect, useRef, useState } from "react";
import POIMarkerPin from "../atoms/POIMarkerPin";

export interface CanvasMarker {
	id: string;
	x: number;
	y: number;
	status: "mapped" | "unmapped";
}

export interface DiagramCanvasViewportProps {
	imageSvgUrl: string;
	markers: CanvasMarker[];
	onMarkerClick?: (id: string) => void;
	onCanvasClick?: (x: number, y: number) => void;
	onMarkerDrag?: (id: string, x: number, y: number) => void;
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

function DiagramCanvasViewport({
	imageSvgUrl,
	markers,
	onMarkerClick,
	onCanvasClick,
	onMarkerDrag,
	panToTarget,
	onZoomChange,
	selectedMarkerId,
	renderMarkerWrapper,
}: DiagramCanvasViewportProps) {
	const theme = useTheme();
	const containerRef = useRef<HTMLDivElement>(null);
	const [panZoomHost, setPanZoomHost] = useState<HTMLDivElement | null>(null);
	const panzoomRef = useRef<PanzoomObject | null>(null);

	// Drag state
	const dragRef = useRef<{
		id: string;
		startX: number;
		startY: number;
		originX: number;
		originY: number;
	} | null>(null);

	// Initialise Panzoom
	useEffect(() => {
		if (!panZoomHost) return;
		const pz = Panzoom(panZoomHost, {
			contain: "outside",
			minScale: 0.5,
			maxScale: 10,
		});
		panzoomRef.current = pz;
		const container = containerRef.current;
		container?.addEventListener("wheel", pz.zoomWithWheel);
		const onPanzoomChange = () => {
			onZoomChange?.(pz.getScale());
		};
		panZoomHost.addEventListener("panzoomchange", onPanzoomChange);
		return () => {
			pz.destroy();
			container?.removeEventListener("wheel", pz.zoomWithWheel);
			panZoomHost.removeEventListener("panzoomchange", onPanzoomChange);
			panzoomRef.current = null;
		};
	}, [panZoomHost, onZoomChange]);

	// Programmatic pan
	useEffect(() => {
		if (!panToTarget) return;
		const pz = panzoomRef.current;
		const container = containerRef.current;
		if (!pz || !container) return;
		const scale = pz.getScale();
		const panX = container.clientWidth / 2 - panToTarget.x * scale;
		const panY = container.clientHeight / 2 - panToTarget.y * scale;
		pz.pan(panX, panY);
	}, [panToTarget]);

	const handleCanvasClick = useCallback(
		(e: React.MouseEvent<HTMLDivElement>) => {
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
		[onCanvasClick, panZoomHost],
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
		[onMarkerDrag],
	);

	const handlePointerUp = useCallback(() => {
		if (dragRef.current) {
			dragRef.current = null;
			panzoomRef.current?.setOptions({ disablePan: false });
		}
	}, []);

	return (
		<Box
			ref={containerRef}
			sx={{
				position: "relative",
				overflow: "hidden",
				border: "1px solid",
				borderColor: "divider",
				borderRadius: 1,
				width: "100%",
				height: "70vh",
				background: theme.palette.map.canvas.bg,
			}}
			data-testid="diagram-canvas"
		>
			{/* Zoom controls overlay */}
			<Box
				sx={{
					position: "absolute",
					top: 8,
					right: 8,
					zIndex: 10,
					display: "flex",
					flexDirection: "column",
					gap: 0.5,
					background: "rgba(255,255,255,0.85)",
					borderRadius: 1,
					p: 0.5,
				}}
			>
				<Tooltip title="Zoom in">
					<IconButton
						size="small"
						onClick={() => panzoomRef.current?.zoomIn()}
						aria-label="zoom in"
					>
						<ZoomInIcon fontSize="small" />
					</IconButton>
				</Tooltip>
				<Tooltip title="Zoom out">
					<IconButton
						size="small"
						onClick={() => panzoomRef.current?.zoomOut()}
						aria-label="zoom out"
					>
						<ZoomOutIcon fontSize="small" />
					</IconButton>
				</Tooltip>
				<Tooltip title="Reset view">
					<IconButton
						size="small"
						onClick={() => panzoomRef.current?.reset()}
						aria-label="reset view"
					>
						<RestartAltIcon fontSize="small" />
					</IconButton>
				</Tooltip>
			</Box>

			{/* Panzoom host — wraps SVG image and markers together */}
			<Box
				ref={setPanZoomHost}
				onClick={handleCanvasClick}
				onPointerMove={handlePointerMove}
				onPointerUp={handlePointerUp}
				sx={{
					position: "relative",
					display: "inline-block",
					cursor: onCanvasClick ? "crosshair" : "grab",
					"&:active": { cursor: onCanvasClick ? "crosshair" : "grabbing" },
					userSelect: "none",
				}}
			>
				{/* SVG schematic */}
				<Box
					component="img"
					src={imageSvgUrl}
					alt="schematic diagram"
					sx={{ display: "block" }}
					draggable={false}
				/>

				{/* Marker pins */}
				{markers.map((marker) => {
					const isSelected = marker.id === selectedMarkerId;
					const isUnmapped = marker.status === "unmapped";
					const button = (
						<IconButton
							key={marker.id}
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
