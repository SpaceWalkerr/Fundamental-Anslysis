import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const savedTheme = window.localStorage.getItem("fkm-theme") === "light" ? "light" : "dark";
document.documentElement.dataset.theme = savedTheme;

createRoot(document.getElementById("root")!).render(<App />);
