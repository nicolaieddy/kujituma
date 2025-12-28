import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installNetworkFailureLogger } from "@/utils/networkDebug";

installNetworkFailureLogger();

createRoot(document.getElementById("root")!).render(<App />);

