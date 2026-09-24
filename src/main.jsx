import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);

// Service Worker (installierbar, App-Hülle offline) nur im Build; in der lokalen
// Vorschau würde er alte Stände festhalten
if(import.meta.env.PROD&&"serviceWorker" in navigator){
  window.addEventListener("load",()=>{navigator.serviceWorker.register(import.meta.env.BASE_URL+"sw.js").catch(()=>{});});
}
