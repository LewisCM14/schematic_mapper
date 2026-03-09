import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import { Box, Drawer, Tab, Tabs } from "@mui/material";
import { useState } from "react";
import POIDetailPanel from "./POIDetailPanel";
import SearchResultsPanel from "./SearchResultsPanel";

interface ViewerLeftDrawerProps {
	width: number;
	imageId: string;
	selectedFpId: string | null;
	onSelectFp: (fittingPositionId: string, x: number, y: number) => void;
	onSearchMetadata?: (
		sourceStatus: Record<string, string>,
		requestId: string,
		refreshedAt: Date,
	) => void;
	/** Externally controlled tab index */
	activeTab?: number;
	onTabChange?: (tab: number) => void;
}

function ViewerLeftDrawer({
	width,
	imageId,
	selectedFpId,
	onSelectFp,
	onSearchMetadata,
	activeTab: controlledTab,
	onTabChange,
}: ViewerLeftDrawerProps) {
	const [internalTab, setInternalTab] = useState(0);
	const activeTab = controlledTab ?? internalTab;
	const setActiveTab = onTabChange ?? setInternalTab;

	return (
		<Drawer
			variant="permanent"
			sx={{
				width,
				flexShrink: 0,
				"& .MuiDrawer-paper": {
					width,
					boxSizing: "border-box",
					top: 0,
					position: "relative",
					height: "100%",
				},
			}}
		>
			<Box sx={{ borderBottom: 1, borderColor: "divider" }}>
				<Tabs
					value={activeTab}
					onChange={(_e, v: number) => setActiveTab(v)}
					variant="fullWidth"
				>
					<Tab
						icon={<SearchOutlinedIcon fontSize="small" />}
						iconPosition="start"
						label="Search"
						aria-label="search tab"
					/>
					<Tab
						icon={<InfoOutlinedIcon fontSize="small" />}
						iconPosition="start"
						label="Information"
						aria-label="information tab"
					/>
				</Tabs>
			</Box>
			{activeTab === 0 && (
				<SearchResultsPanel
					imageId={imageId}
					onSelectFp={onSelectFp}
					onSearchMetadata={onSearchMetadata}
				/>
			)}
			{activeTab === 1 && <POIDetailPanel fittingPositionId={selectedFpId} />}
		</Drawer>
	);
}

export default ViewerLeftDrawer;
