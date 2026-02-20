import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ThemeProvider } from "./lib/useTheme";
import "./index.css";

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchInterval: 30000, // Refetch every 30 seconds
            refetchOnWindowFocus: true,
            staleTime: 15000 // Consider data stale after 15 seconds
        }
    }
});

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <ThemeProvider>
                <App />
            </ThemeProvider>
        </QueryClientProvider>
    </React.StrictMode>
);
