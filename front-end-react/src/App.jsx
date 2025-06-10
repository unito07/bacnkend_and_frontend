import React, { useState, useEffect, useCallback } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { getMachineFingerprint } from "./lib/fingerprint"; // Import the fingerprint utility
import LandingPage from "./pages/LandingPage";
import ScraperPage from "./pages/ScraperPage";
import AboutUsPage from "./pages/AboutUsPage";
import DocumentationPage from "./pages/DocumentationPage";
import HistoryLogsPage from "./pages/HistoryLogsPage";
import SettingsPage from "./pages/SettingsPage";
import Navbar from "./components/Navbar"; // Import the Navbar
import LicenseModal from "./components/LicenseModal"; // Import the LicenseModal
import { Toaster } from "sonner";

export default function App() {
  const [isLicenseValidated, setIsLicenseValidated] = useState(false);
  const [isLoadingLicense, setIsLoadingLicense] = useState(true);
  const [machineFingerprint, setMachineFingerprint] = useState('');

  useEffect(() => {
    const fp = getMachineFingerprint();
    setMachineFingerprint(fp);
  }, []);

  const checkLicenseStatus = useCallback(async () => {
    if (!machineFingerprint) {
      // Fingerprint might not be set on the very first render cycle
      // This check will re-run once machineFingerprint state is updated
      if (getMachineFingerprint()) { // try to get it again if state not updated yet
         setMachineFingerprint(getMachineFingerprint());
      }
      return;
    }

    setIsLoadingLicense(true);
    try {
      const response = await fetch('/api/v1/license/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ machine_fingerprint: machineFingerprint }),
      });
      if (response.ok) {
        const result = await response.json();
        if (result.is_active) {
          setIsLicenseValidated(true);
        } else {
          setIsLicenseValidated(false);
          // Clear any old localStorage flags if backend says not active
          localStorage.removeItem('licenseValidated');
          localStorage.removeItem('licenseId');
        }
      } else {
        // Handle non-OK responses from status check (e.g., server error)
        setIsLicenseValidated(false);
        localStorage.removeItem('licenseValidated');
        localStorage.removeItem('licenseId');
        console.error("License status check failed:", response.statusText);
      }
    } catch (error) {
      console.error("Error checking license status:", error);
      setIsLicenseValidated(false); // Default to not validated on error
      localStorage.removeItem('licenseValidated');
      localStorage.removeItem('licenseId');
    } finally {
      setIsLoadingLicense(false);
    }
  }, [machineFingerprint]); // Rerun when machineFingerprint is available

  useEffect(() => {
    // Only run checkLicenseStatus if machineFingerprint is set
    if (machineFingerprint) {
      checkLicenseStatus();
    }
  }, [machineFingerprint, checkLicenseStatus]);


  const handleLicenseValidated = (status) => {
    // This is called by LicenseModal after an activation attempt
    setIsLicenseValidated(status);
    if (status) {
      // If activation was successful, we can also update localStorage immediately
      // for a slightly smoother experience if the user refreshes before next status check completes,
      // though the backend status check is the source of truth.
      localStorage.setItem('licenseValidated', 'true'); // Optional: for immediate refresh persistence
    } else {
      localStorage.removeItem('licenseValidated');
      localStorage.removeItem('licenseId');
    }
  };

  if (isLoadingLicense) {
    // Optional: Render a loading spinner or a blank page while checking license
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <p className="text-white text-xl">Loading...</p>
      </div>
    );
  }

  return (
    <Router>
      {!isLicenseValidated ? (
        <LicenseModal 
          onLicenseValidated={handleLicenseValidated} 
          machineFingerprint={machineFingerprint} 
        />
      ) : (
        <>
          <Navbar /> {/* Add the Navbar component here */}
          <main className="min-h-screen bg-slate-900 text-white pt-16"> {/* Added pt-16 assuming navbar height */}
            {/* The Navbar might affect page layout, consider if main needs padding-top */}
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/app" element={<ScraperPage />} />
              <Route path="/about" element={<AboutUsPage />} />
              <Route path="/docs" element={<DocumentationPage />} />
              <Route path="/history" element={<HistoryLogsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              {/* Add a catch-all or redirect if needed for invalid paths when licensed */}
            </Routes>
          </main>
        </>
      )}
      <Toaster richColors position="top-right" /> {/* Add Toaster here */}
    </Router>
  );
}
