import { v4 as uuidv4 } from 'uuid';

const FINGERPRINT_KEY = 'machineFingerprint';

export const getMachineFingerprint = () => {
  let fingerprint = localStorage.getItem(FINGERPRINT_KEY);
  if (!fingerprint) {
    fingerprint = uuidv4();
    localStorage.setItem(FINGERPRINT_KEY, fingerprint);
  }
  return fingerprint;
};
