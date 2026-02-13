import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { initAnalytics, AttributionEvents } from "./lib/analytics";
import "./styles/globals.css";

// Initialize analytics before React renders
initAnalytics();

// Capture UTM parameters on page load
function captureUtmParams() {
    const params = new URLSearchParams(window.location.search);
    const utmSource = params.get("utm_source");
    const utmMedium = params.get("utm_medium");
    const utmCampaign = params.get("utm_campaign");
    const utmTerm = params.get("utm_term");
    const utmContent = params.get("utm_content");

    if (utmSource || utmMedium || utmCampaign || utmTerm || utmContent) {
        AttributionEvents.utmCaptured({
            utmSource: utmSource || undefined,
            utmMedium: utmMedium || undefined,
            utmCampaign: utmCampaign || undefined,
            utmTerm: utmTerm || undefined,
            utmContent: utmContent || undefined
        });
    }

    // Capture referrer
    if (document.referrer && !document.referrer.includes(window.location.hostname)) {
        AttributionEvents.referrerCaptured({
            referrer: document.referrer,
            landingPage: window.location.pathname
        });
    }
}

captureUtmParams();

const rootElement = document.getElementById("root");

if (!rootElement) {
    throw new Error("Root element not found");
}

ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
        <BrowserRouter>
            <App />
        </BrowserRouter>
    </React.StrictMode>
);
