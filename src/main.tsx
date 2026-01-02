import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installNetworkFailureLogger } from "@/utils/networkDebug";
import { setupPwaUpdates } from "@/pwa/pwaUpdates";

installNetworkFailureLogger();
setupPwaUpdates();

createRoot(document.getElementById("root")!).render(<App />);

