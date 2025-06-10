import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const LicenseModal = ({ onLicenseValidated, machineFingerprint }) => {
  const [licenseKey, setLicenseKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!licenseKey.trim()) {
      setError('License key cannot be empty.');
      toast.error('License key cannot be empty.');
      return;
    }
    setIsLoading(true);
    setError('');

    if (!machineFingerprint) {
      const fpError = "Machine fingerprint is not available. Cannot activate.";
      setError(fpError);
      toast.error(fpError);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/v1/license/activate', { // Changed endpoint
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          license_key: licenseKey,
          machine_fingerprint: machineFingerprint // Send fingerprint
        }),
      });

      const result = await response.json();

      // Backend now returns `activated` field and potentially more details
      if (response.ok && result.activated) {
        toast.success(result.message || 'License activated successfully!');
        // App.jsx will handle re-checking status or can rely on this callback for immediate UI update.
        // No direct localStorage manipulation here for 'licenseValidated' or 'licenseId'
        // as App.jsx is the source of truth for displaying based on /status or this callback.
        onLicenseValidated(true); 
      } else {
        // Error could be from Keygen (via our backend) or our backend itself
        const errorMessage = result.error || result.detail || (response.status === 400 ? "Invalid input." : "Activation failed. Please check the key or contact support.");
        setError(errorMessage);
        toast.error(errorMessage);
        onLicenseValidated(false);
      }
    } catch (err) {
      // This catch block handles network errors or if the server is down
      const catchError = 'Failed to connect to the activation server. Please check your network connection.';
      setError(catchError);
      toast.error(catchError);
      onLicenseValidated(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900 bg-opacity-90 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 p-6 sm:p-8 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">Activate Application</h2>
        <p className="text-slate-300 mb-6 text-center text-sm">
          Please enter your license key to activate and use the application.
        </p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="licenseKey" className="block text-sm font-medium text-slate-200 mb-1">
              License Key
            </label>
            <Input
              id="licenseKey"
              type="text"
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              placeholder="Enter your license key"
              className="bg-slate-700 border-slate-600 text-white placeholder-slate-400 focus:ring-sky-500 focus:border-sky-500"
              disabled={isLoading}
            />
          </div>
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <Button
            type="submit"
            className="w-full bg-sky-600 hover:bg-sky-700 text-white font-semibold py-3 rounded-md transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-800"
            disabled={isLoading}
          >
            {isLoading ? 'Activating...' : 'Activate'}
          </Button>
        </form>
        <p className="text-xs text-slate-500 mt-6 text-center">
          If you don't have a license key, please contact support.
        </p>
      </div>
    </div>
  );
};

export default LicenseModal;
