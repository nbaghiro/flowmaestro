import { useParams } from "react-router-dom";
import { WidgetContainer } from "../components/chat/widget/WidgetContainer";

/**
 * WidgetChatPage - Standalone page for the widget embed
 *
 * This page is loaded via /widget/:slug and renders the floating widget.
 * It's designed to be embedded on external websites via a script tag that
 * creates an iframe pointing to this page.
 */
export function WidgetChatPage() {
    const { slug } = useParams<{ slug: string }>();

    if (!slug) {
        return null;
    }

    return (
        <div className="fixed inset-0">
            <WidgetContainer slug={slug} />
        </div>
    );
}
