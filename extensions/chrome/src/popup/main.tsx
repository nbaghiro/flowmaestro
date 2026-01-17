import React from "react";
import { createRoot } from "react-dom/client";
import { applyTheme, getTheme } from "../shared/storage";
import Popup from "./Popup";
import "../styles.css";

// Apply theme before React renders to avoid flash
getTheme().then(applyTheme);

const container = document.getElementById("root");
if (container) {
    const root = createRoot(container);
    root.render(
        <React.StrictMode>
            <Popup />
        </React.StrictMode>
    );
}
