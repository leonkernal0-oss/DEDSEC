import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

try {
  const root = document.getElementById("root");
  if (!root) {
    throw new Error("Root element not found");
  }
  
  ReactDOM.createRoot(root).render(<App />);
  console.log("RemoteDesk app loaded successfully");
} catch (error) {
  console.error("Failed to load app:", error);
  const root = document.getElementById("root");
  if (root) {
    root.innerHTML = `<div class="app-error">
      <h1>Failed to Load App</h1>
      <pre>${error instanceof Error ? error.stack || error.message : String(error)}</pre>
      <p style="color: #94a3b8; margin-top: 10px;">
        Please check the browser console (F12) for more details.
      </p>
    </div>`;
  }
}
