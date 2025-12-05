import { Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ThemeProvider } from "./components/ThemeProvider";
import { Account } from "./pages/Account";
import { AgentBuilder } from "./pages/AgentBuilder";
import { Agents } from "./pages/Agents";
import { Analytics } from "./pages/Analytics";
import { Connections } from "./pages/Connections";
import { FlowBuilder } from "./pages/FlowBuilder";
import { ForgotPassword } from "./pages/ForgotPassword";
import { KnowledgeBaseDetail } from "./pages/KnowledgeBaseDetail";
import { KnowledgeBases } from "./pages/KnowledgeBases";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { ResetPassword } from "./pages/ResetPassword";
import { Settings } from "./pages/Settings";
import { Templates } from "./pages/Templates";
import { VerifyEmail } from "./pages/VerifyEmail";
import { Workflows } from "./pages/Workflows";
import { Workspace } from "./pages/Workspace";

function App() {
    return (
        <ThemeProvider>
            <Routes>
                {/* Auth routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/verify-email" element={<VerifyEmail />} />

                {/* Protected routes with sidebar layout */}
                <Route
                    path="/"
                    element={
                        <ProtectedRoute>
                            <AppLayout />
                        </ProtectedRoute>
                    }
                >
                    <Route index element={<Workflows />} />
                    <Route path="agents" element={<Agents />} />
                    <Route path="analytics" element={<Analytics />} />
                    <Route path="connections" element={<Connections />} />
                    <Route path="knowledge-bases" element={<KnowledgeBases />} />
                    <Route path="templates" element={<Templates />} />
                    <Route path="settings" element={<Settings />} />
                    <Route path="account" element={<Account />} />
                    <Route path="workspace" element={<Workspace />} />
                </Route>

                {/* Full-screen knowledge base detail without sidebar */}
                <Route
                    path="/knowledge-bases/:id"
                    element={
                        <ProtectedRoute>
                            <KnowledgeBaseDetail />
                        </ProtectedRoute>
                    }
                />

                {/* Full-screen builder without sidebar */}
                <Route
                    path="/builder/:workflowId"
                    element={
                        <ProtectedRoute>
                            <FlowBuilder />
                        </ProtectedRoute>
                    }
                />

                {/* Full-screen agent builder without sidebar */}
                <Route
                    path="/agents/:agentId"
                    element={
                        <ProtectedRoute>
                            <AgentBuilder />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/agents/:agentId/build"
                    element={
                        <ProtectedRoute>
                            <AgentBuilder />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/agents/:agentId/threads"
                    element={
                        <ProtectedRoute>
                            <AgentBuilder />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/agents/:agentId/threads/:threadId"
                    element={
                        <ProtectedRoute>
                            <AgentBuilder />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/agents/:agentId/settings"
                    element={
                        <ProtectedRoute>
                            <AgentBuilder />
                        </ProtectedRoute>
                    }
                />

                {/* Catch all - redirect to root */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </ThemeProvider>
    );
}

export default App;
