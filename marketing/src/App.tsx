import React from "react";
import { Routes, Route } from "react-router-dom";
import { Home } from "./pages/Home";
import { IntegrationsPage } from "./pages/IntegrationsPage";
import { PricingPage } from "./pages/PricingPage";

const App: React.FC = () => {
    return (
        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/integrations" element={<IntegrationsPage />} />
            <Route path="/pricing" element={<PricingPage />} />
        </Routes>
    );
};

export default App;
