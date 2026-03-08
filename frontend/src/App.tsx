import { Route, Routes } from "react-router-dom";
import ImageSelectionPage from "./pages/ImageSelectionPage";
import ImageViewerPage from "./pages/ImageViewerPage";

function App() {
	return (
		<Routes>
			<Route path="/" element={<ImageSelectionPage />} />
			<Route path="/viewer/:imageId" element={<ImageViewerPage />} />
		</Routes>
	);
}

export default App;
