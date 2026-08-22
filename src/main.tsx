import { StrictMode } from "react";

import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { I18nProvider } from "./i18n";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element was not found");

createRoot(rootElement).render(
    <StrictMode>
        <I18nProvider>
            <App />
        </I18nProvider>
    </StrictMode>,
);
