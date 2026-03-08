import { Route, Routes } from "react-router-dom";
import AdminPage from "./pages/AdminPage";
import ImageSelectionPage from "./pages/ImageSelectionPage";
import ImageViewerPage from "./pages/ImageViewerPage";

function App() {
	return (
		<Routes>
			<Route path="/" element={<ImageSelectionPage />} />
			<Route path="/viewer/:imageId" element={<ImageViewerPage />} />
			<Route path="/admin" element={<AdminPage />} />
		</Routes>
	);
}

export default App;
