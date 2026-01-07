import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { useAnalytics } from "./hooks/use-analytics";

// Initialize analytics early
if (typeof window !== 'undefined') {
	// call once — the hook used inside App will also ensure init for SPA nav
	import('./lib/analytics').then(({ initAnalytics }) => initAnalytics()).catch(() => {});
}

createRoot(document.getElementById("root")!).render(<App />);
