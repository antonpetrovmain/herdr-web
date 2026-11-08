import "@fontsource-variable/geist/wght.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { AppErrorBoundary, installAppRecovery } from "./appRecovery";
import { BridgeProvider } from "./bridge";
import { startNativeControls } from "./native";
import "./styles.css";

startNativeControls();
installAppRecovery();

const root = document.getElementById("root");

if (!root) {
  throw new Error("missing root element");
}

createRoot(root).render(
  <StrictMode>
    <AppErrorBoundary>
      <BridgeProvider>
        <App />
      </BridgeProvider>
    </AppErrorBoundary>
  </StrictMode>,
);
