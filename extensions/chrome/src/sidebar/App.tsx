import { useEffect } from "react";
import { AgentChat } from "./components/AgentChat";
import { Header } from "./components/Header";
import { KnowledgeBase } from "./components/KnowledgeBase";
import { LoadingScreen } from "./components/LoadingScreen";
import { LoginScreen } from "./components/LoginScreen";
import { TabNavigation } from "./components/TabNavigation";
import { WorkflowPicker } from "./components/WorkflowPicker";
import { useSidebarStore } from "./stores/sidebarStore";

export default function App() {
    const { isLoading, isAuthenticated, activeTab, initialize } = useSidebarStore();

    useEffect(() => {
        initialize();
    }, [initialize]);

    if (isLoading) {
        return <LoadingScreen />;
    }

    if (!isAuthenticated) {
        return <LoginScreen />;
    }

    return (
        <div className="flex flex-col h-screen abstract-bg">
            <Header />
            <TabNavigation />
            <main className="flex-1 overflow-hidden">
                {activeTab === "agents" && <AgentChat />}
                {activeTab === "workflows" && <WorkflowPicker />}
                {activeTab === "kb" && <KnowledgeBase />}
            </main>
        </div>
    );
}
