import { Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ThemeProvider } from "./components/ThemeProvider";
import { AcceptInvitation } from "./pages/AcceptInvitation";
import { Account } from "./pages/Account";
import { AgentBuilder } from "./pages/AgentBuilder";
import { Agents } from "./pages/Agents";
import { Analytics } from "./pages/Analytics";
import { ChatInterfaceEditorPage } from "./pages/ChatInterfaceEditorPage";
import { ChatInterfacePreviewPage } from "./pages/ChatInterfacePreviewPage";
import { ChatInterfaceSessionsPage } from "./pages/ChatInterfaceSessionsPage";
import { ChatInterfacesPage } from "./pages/ChatInterfacesPage";
import { Connections } from "./pages/Connections";
import { EmbedChatPage } from "./pages/EmbedChatPage";
import { FlowBuilder } from "./pages/FlowBuilder";
import { FolderContentsPage } from "./pages/FolderContentsPage";
import { ForgotPassword } from "./pages/ForgotPassword";
import { FormInterfaceEditor } from "./pages/FormInterfaceEditor";
import { FormInterfaces } from "./pages/FormInterfaces";
import { FormInterfaceSubmissions } from "./pages/FormInterfaceSubmissions";
import { Home } from "./pages/Home";
import { KnowledgeBaseDetail } from "./pages/KnowledgeBaseDetail";
import { KnowledgeBases } from "./pages/KnowledgeBases";
import { Login } from "./pages/Login";
import { PersonaInstances } from "./pages/PersonaInstances";
import { PersonaInstanceView } from "./pages/PersonaInstanceView";
import { Personas } from "./pages/Personas";
import { PublicChatPage } from "./pages/PublicChatPage";
import { PublicFormInterfacePage } from "./pages/PublicFormInterface";
import { Register } from "./pages/Register";
import { ResetPassword } from "./pages/ResetPassword";
import { Settings } from "./pages/Settings";
import { Templates } from "./pages/Templates";
import { VerifyEmail } from "./pages/VerifyEmail";
import { WidgetChatPage } from "./pages/WidgetChatPage";
import { Workflows } from "./pages/Workflows";
import { Workspace } from "./pages/Workspace";
import { WorkspaceSettings } from "./pages/WorkspaceSettings";

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
                <Route path="/accept-invitation" element={<AcceptInvitation />} />

                {/* Protected routes with sidebar layout */}
                <Route
                    path="/"
                    element={
                        <ProtectedRoute>
                            <AppLayout />
                        </ProtectedRoute>
                    }
                >
                    <Route index element={<Home />} />
                    <Route path="workflows" element={<Workflows />} />
                    <Route path="agents" element={<Agents />} />
                    <Route path="form-interfaces" element={<FormInterfaces />} />
                    <Route
                        path="form-interfaces/:id/submissions"
                        element={<FormInterfaceSubmissions />}
                    />
                    <Route path="chat-interfaces" element={<ChatInterfacesPage />} />
                    <Route path="analytics" element={<Analytics />} />
                    <Route path="connections" element={<Connections />} />
                    <Route path="knowledge-bases" element={<KnowledgeBases />} />
                    <Route path="templates" element={<Templates />} />
                    <Route path="personas" element={<Personas />} />
                    <Route path="persona-instances" element={<PersonaInstances />} />
                    <Route path="settings" element={<Settings />} />
                    <Route path="account" element={<Account />} />
                    <Route path="workspace" element={<Workspace />} />
                    <Route path="workspace/settings" element={<WorkspaceSettings />} />
                    <Route path="folders/:folderId" element={<FolderContentsPage />} />
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

                {/* Full-screen persona instance view without sidebar */}
                <Route
                    path="/persona-instances/:id"
                    element={
                        <ProtectedRoute>
                            <PersonaInstanceView />
                        </ProtectedRoute>
                    }
                />

                {/* Full-screen form interface editor without sidebar */}
                <Route
                    path="/form-interfaces/:id/edit"
                    element={
                        <ProtectedRoute>
                            <FormInterfaceEditor />
                        </ProtectedRoute>
                    }
                />

                {/* Full-screen chat interface editor without sidebar */}
                <Route
                    path="/chat-interfaces/:id/edit"
                    element={
                        <ProtectedRoute>
                            <ChatInterfaceEditorPage />
                        </ProtectedRoute>
                    }
                />

                {/* Full-screen chat interface preview without sidebar */}
                <Route
                    path="/chat-interfaces/:id/preview"
                    element={
                        <ProtectedRoute>
                            <ChatInterfacePreviewPage />
                        </ProtectedRoute>
                    }
                />

                {/* Chat interface sessions page */}
                <Route
                    path="/chat-interfaces/:id/sessions"
                    element={
                        <ProtectedRoute>
                            <ChatInterfaceSessionsPage />
                        </ProtectedRoute>
                    }
                />

                {/* Public form interface (no auth required) */}
                <Route path="/i/:slug" element={<PublicFormInterfacePage />} />

                {/* Public chat interface (no auth required) */}
                <Route path="/c/:slug" element={<PublicChatPage />} />

                {/* Embedded chat interface for iframe (no auth required) */}
                <Route path="/embed/:slug" element={<EmbedChatPage />} />

                {/* Widget chat interface for external websites (no auth required) */}
                <Route path="/widget/:slug" element={<WidgetChatPage />} />

                {/* Catch all - redirect to root */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </ThemeProvider>
    );
}

export default App;
