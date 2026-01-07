import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FlowMaestroWidget } from "@flowmaestro/widget/react";

const baseUrl = import.meta.env.VITE_API_URL || "https://api.flowmaestro.ai";

function DynamicChat() {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const [inputSlug, setInputSlug] = useState(slug || "");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputSlug.trim()) {
            navigate(`/chat/${inputSlug.trim()}`);
        }
    };

    return (
        <div className="page">
            <h1>Dynamic Chat Widget</h1>
            <p className="subtitle">Load different chat interfaces by changing the URL slug.</p>

            <div className="warning-box">
                <strong>Note:</strong> This page loads a different widget based on the URL. The
                default widget from other pages is hidden here.
            </div>

            <h2>Current Slug</h2>
            <p>
                The widget is currently loading with slug: <code>{slug || "none"}</code>
            </p>

            <h2>Change Chat Interface</h2>
            <p>Enter a different slug to load a different chat interface:</p>

            <form onSubmit={handleSubmit}>
                <div className="input-group">
                    <label htmlFor="slug-input">Chat Interface Slug</label>
                    <input
                        id="slug-input"
                        type="text"
                        value={inputSlug}
                        onChange={(e) => setInputSlug(e.target.value)}
                        placeholder="Enter a chat interface slug"
                    />
                </div>
                <button type="submit" className="button">
                    Load Widget
                </button>
            </form>

            <h2>How Dynamic Loading Works</h2>
            <p>
                This page demonstrates loading widgets dynamically based on URL parameters. This is
                useful for:
            </p>
            <ul>
                <li>
                    <strong>Multi-tenant applications</strong> - Different customers get different
                    chat interfaces
                </li>
                <li>
                    <strong>A/B testing</strong> - Test different chat configurations
                </li>
                <li>
                    <strong>Department routing</strong> - Different pages use different support
                    channels
                </li>
            </ul>

            <pre>
                <code>{`// URL: /chat/sales-support
const { slug } = useParams();

<FlowMaestroWidget
    slug={slug}  // "sales-support"
    baseUrl="${baseUrl}"
    position="bottom-left"
/>`}</code>
            </pre>

            <h2>Try These URLs</h2>
            <ul>
                <li>
                    <code>/chat/support</code> - Support chat
                </li>
                <li>
                    <code>/chat/sales</code> - Sales chat
                </li>
                <li>
                    <code>/chat/demo</code> - Demo chat
                </li>
            </ul>
            <p>
                <em>(Replace with your actual published chat interface slugs)</em>
            </p>

            {/* Dynamic Widget - only renders when we have a slug */}
            {slug && (
                <FlowMaestroWidget
                    slug={slug}
                    baseUrl={baseUrl}
                    position="bottom-left"
                    initialState="collapsed"
                />
            )}
        </div>
    );
}

export default DynamicChat;
