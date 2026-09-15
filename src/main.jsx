import React, {
  StrictMode,
} from "react";

import { createRoot } from "react-dom/client";

import App from "./App.jsx";
import CrmApp from "./CrmApp.jsx";

import "./index.css";
import "./crm.css";

const isCrm =
  window.location.pathname.startsWith(
    "/crm"
  );

createRoot(
  document.getElementById("root")
).render(
  <StrictMode>
    {isCrm ? (
      <CrmApp />
    ) : (
      <App />
    )}
  </StrictMode>
);
