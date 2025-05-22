import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import ScraperPage from "./pages/ScraperPage";
import AboutUsPage from "./pages/AboutUsPage";
import DocumentationPage from "./pages/DocumentationPage";
import HistoryLogsPage from "./pages/HistoryLogsPage";
import SettingsPage from "./pages/SettingsPage";

export default function App() {
  return (
    <Router>
      <main>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/app" element={<ScraperPage />} />
          <Route path="/about" element={<AboutUsPage />} />
          <Route path="/docs" element={<DocumentationPage />} />
          <Route path="/history" element={<HistoryLogsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </Router>
  );
}
