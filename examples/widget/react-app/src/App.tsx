import { Routes, Route, Link, useLocation } from "react-router-dom";
import { FlowMaestroWidget } from "@flowmaestro/widget/react";
import About from "./pages/About";
import DynamicChat from "./pages/DynamicChat";
import Home from "./pages/Home";
import HookExample from "./pages/HookExample";

const baseUrl = import.meta.env.VITE_API_URL || "https://api.flowmaestro.ai";
const defaultSlug = import.meta.env.VITE_WIDGET_SLUG || "customer-support-agent-chat";

function App() {
    const location = useLocation();

    // Only load the default widget on non-dynamic pages
    const showDefaultWidget =
        !location.pathname.startsWith("/chat/") && !location.pathname.startsWith("/hook");

    return (
        <div className="app">
            {/* Navigation */}
            <nav className="nav">
                <div className="nav-brand">FlowMaestro Widget Demo</div>
                <div className="nav-links">
                    <Link to="/" className={location.pathname === "/" ? "active" : ""}>
                        Home
                    </Link>
                    <Link to="/about" className={location.pathname === "/about" ? "active" : ""}>
                        About
                    </Link>
                    <Link
                        to="/chat/demo-slug"
                        className={location.pathname.startsWith("/chat/") ? "active" : ""}
                    >
                        Dynamic Chat
                    </Link>
                    <Link
                        to="/hook"
                        className={location.pathname.startsWith("/hook") ? "active" : ""}
                    >
                        Hook Example
                    </Link>
                </div>
            </nav>

            {/* Main Content */}
            <main className="main">
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/chat/:slug" element={<DynamicChat />} />
                    <Route path="/hook" element={<HookExample />} />
                </Routes>
            </main>

            {/* Footer */}
            <footer className="footer">
                <p>
                    API URL: <code>{baseUrl}</code>
                </p>
                <p>
                    Default Slug: <code>{defaultSlug}</code>
                </p>
            </footer>

            {/* Default Widget - persists across routes except /chat/:slug and /hook */}
            {showDefaultWidget && (
                <FlowMaestroWidget
                    slug={defaultSlug}
                    baseUrl={baseUrl}
                    position="bottom-right"
                    // eslint-disable-next-line no-console
                    onReady={() => console.log("Widget ready")}
                    // eslint-disable-next-line no-console
                    onOpen={() => console.log("Widget opened")}
                    // eslint-disable-next-line no-console
                    onClose={() => console.log("Widget closed")}
                />
            )}
        </div>
    );
}

export default App;
