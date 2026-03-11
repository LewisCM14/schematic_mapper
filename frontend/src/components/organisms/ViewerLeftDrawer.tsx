import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import { Box, Drawer, Tab, Tabs } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useState } from "react";
import POIDetailPanel from "./POIDetailPanel";
import SearchResultsPanel from "./SearchResultsPanel";

interface ViewerLeftDrawerProps {
	width: number;
	imageId: string;
	selectedFpId: string | null;
	onSelectFp: (fittingPositionId: string, x: number, y: number) => void;
	searchQuery?: string;
	onSearchQueryChange?: (value: string) => void;
	activeSources?: string[];
	onActiveSourcesChange?: (value: string[]) => void;
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
	searchQuery,
	onSearchQueryChange,
	activeSources,
	onActiveSourcesChange,
	onSearchMetadata,
	activeTab: controlledTab,
	onTabChange,
}: ViewerLeftDrawerProps) {
	const theme = useTheme();
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
					background: theme.palette.panel.drawer.bg,
				},
			}}
		>
			<Box sx={{ borderBottom: 1, borderColor: "divider" }}>
				<Tabs
					value={activeTab}
					onChange={(_e, v: number) => setActiveTab(v)}
					variant="fullWidth"
					sx={{
						"& .Mui-selected": {
							background: theme.palette.panel.drawer.tab.active,
							color: theme.palette.panel.drawer.tab.text.active,
						},
					}}
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
			<Box
				sx={{ display: activeTab === 0 ? "block" : "none", height: "100%" }}
				aria-hidden={activeTab !== 0}
			>
				<SearchResultsPanel
					imageId={imageId}
					onSelectFp={onSelectFp}
					query={searchQuery}
					onQueryChange={onSearchQueryChange}
					activeSources={activeSources}
					onActiveSourcesChange={onActiveSourcesChange}
					onSearchMetadata={onSearchMetadata}
				/>
			</Box>
			<Box
				sx={{ display: activeTab === 1 ? "block" : "none", height: "100%" }}
				aria-hidden={activeTab !== 1}
			>
				<POIDetailPanel fittingPositionId={selectedFpId} />
			</Box>
		</Drawer>
	);
}

export default ViewerLeftDrawer;
