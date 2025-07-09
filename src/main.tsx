import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import Main from "./pages/Main";
import "./styles.css";
import "./main.css";

// React PDF Viewer styles - required for text selection and highlighting
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";
import "@react-pdf-viewer/highlight/lib/styles/index.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found");
}

const queryClient = new QueryClient();

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <Main />
    </QueryClientProvider>
  </React.StrictMode>
);
