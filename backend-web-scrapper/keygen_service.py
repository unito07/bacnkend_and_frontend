import os
import sys # Added for PyInstaller path
import requests
import logging
import asyncio # Added for to_thread
from dotenv import load_dotenv
from typing import Optional

# User-provided fix to ensure .env is loaded correctly, with debug output.
if getattr(sys, 'frozen', False):
    env_path = os.path.join(sys._MEIPASS, '.env')
else:
    env_path = os.path.join(os.path.dirname(__file__), '.env')

print(f"[DEBUG] Loading .env from: {env_path}")
load_dotenv(env_path)
# End of user-provided fix.


logger = logging.getLogger(__name__)

KEYGEN_PRODUCT_TOKEN = os.getenv("KEYGEN_PRODUCT_TOKEN")
KEYGEN_ACCOUNT_ID = os.getenv("KEYGEN_ACCOUNT_ID")
KEYGEN_API_BASE_URL = "https://api.keygen.sh/v1"

async def _register_machine_with_keygen(license_id: str, fingerprint: str, headers: dict) -> tuple[bool, dict]:
    """
    Registers a machine (fingerprint) with Keygen.sh for a given license ID.
    Returns (success_boolean, response_json_dict).
    """
    machines_url = f"{KEYGEN_API_BASE_URL}/accounts/{KEYGEN_ACCOUNT_ID}/machines"
    payload = {
        "data": {
            "type": "machines",
            "attributes": {
                "fingerprint": fingerprint,
                # "name": "User's Machine" # Optional: Add a name if desired
            },
            "relationships": {
                "license": {
                    "data": {
                        "type": "licenses",
                        "id": license_id
                    }
                }
            }
        }
    }
    try:
        logger.info(f"Registering machine {fingerprint[:8]}... with license ID {license_id} (Keygen)")
        response = await asyncio.to_thread(
            requests.post, machines_url, headers=headers, json=payload, timeout=15
        )
        response_data = response.json()

        if response.status_code == 201: # HTTP 201 Created
            logger.info(f"Machine {fingerprint[:8]}... successfully registered with license ID {license_id}.")
            return True, response_data
        else:
            error_detail = "Unknown error during machine registration."
            error_code = "MACHINE_REGISTRATION_API_ERROR"
            if "errors" in response_data and response_data["errors"]:
                error_detail = response_data["errors"][0].get("detail", "Keygen API error during machine registration.")
                # Check if it's a conflict (machine already registered to this license)
                if response_data["errors"][0].get("code") == "FINGERPRINT_TAKEN" and \
                   response_data["errors"][0].get("source", {}).get("pointer") == "/data/attributes/fingerprint":
                     # This specific error means the fingerprint is already associated with THIS license.
                     # This can be treated as a success for our purposes, as the goal is to have it associated.
                     logger.info(f"Machine {fingerprint[:8]}... already registered with license ID {license_id} (FINGERPRINT_TAKEN for this license).")
                     return True, {"message": "Machine already registered with this license."} # Simulate a success response
            
            logger.error(f"Keygen API error (HTTP {response.status_code}) registering machine {fingerprint[:8]}...: {error_detail}")
            return False, {"error": error_detail, "error_code": error_code, "status_code": response.status_code}

    except requests.exceptions.Timeout:
        logger.error(f"Timeout while registering machine {fingerprint[:8]}...")
        return False, {"error": "Timeout connecting to license server for machine registration.", "error_code": "TIMEOUT"}
    except requests.exceptions.RequestException as e:
        logger.error(f"RequestException while registering machine {fingerprint[:8]}...: {e}")
        return False, {"error": f"Error connecting to license server for machine registration: {str(e)}", "error_code": "REQUEST_EXCEPTION"}
    except Exception as e:
        logger.error(f"Unexpected error in _register_machine_with_keygen for {fingerprint[:8]}...: {e}", exc_info=True)
        return False, {"error": "An unexpected server error occurred during machine registration.", "error_code": "UNEXPECTED_ERROR"}

async def validate_license_key(license_key: str, fingerprint: Optional[str] = None) -> dict:
    """
    Validates a license key against the Keygen.sh API, optionally including a machine fingerprint.
    If NO_MACHINE error occurs, attempts to register the machine and re-validates.
    """
    if not KEYGEN_PRODUCT_TOKEN or not KEYGEN_ACCOUNT_ID:
        logger.error("Keygen Product Token or Account ID is not configured in environment variables.")
        return {"valid": False, "error": "Server configuration error: Keygen credentials missing."}

    if not license_key or not license_key.strip():
        return {"valid": False, "error": "License key cannot be empty."}

    validation_url = f"{KEYGEN_API_BASE_URL}/accounts/{KEYGEN_ACCOUNT_ID}/licenses/actions/validate-key"
    headers = {
        "Authorization": f"Bearer {KEYGEN_PRODUCT_TOKEN}",
        "Content-Type": "application/vnd.api+json",
        "Accept": "application/vnd.api+json"
    }
    payload = {
        "meta": {
            "key": license_key.strip()
        }
    }
    if fingerprint:
        payload["meta"]["scope"] = {"fingerprint": fingerprint}
        logger.info(f"Validating license key: {license_key[:4]}... with fingerprint: {fingerprint[:8]}... (Keygen)")
    else:
        logger.info(f"Validating license key: {license_key[:4]}... (Keygen, no fingerprint)")

    # Initial validation attempt
    try:
        response = await asyncio.to_thread(
            requests.post, validation_url, headers=headers, json=payload, timeout=15
        )
        response_data = response.json()
        
        if response.status_code == 200:
            validation_meta = response_data.get("meta", {})
            validation_code = validation_meta.get("code")

            if validation_code == "VALID":
                logger.info(f"License key VALID: {license_key[:4]}...")
                return {
                    "valid": True,
                    "data": response_data.get("data"),
                    "meta": validation_meta
                }
            elif validation_code == "NO_MACHINE" and fingerprint:
                logger.warning(f"License key {license_key[:4]}... requires machine activation (NO_MACHINE) for fingerprint {fingerprint[:8]}.... Attempting to register machine.")
                license_object = response_data.get("data")
                if not license_object or not license_object.get("id"):
                    logger.error(f"NO_MACHINE code received but no license ID found in Keygen response for key {license_key[:4]}...")
                    return {"valid": False, "error_code": "NO_MACHINE_MISSING_LICENSE_ID", "error": "License is valid but machine activation failed: missing license ID from provider.", "meta": validation_meta}
                
                license_id = license_object.get("id")

                machine_registration_success, machine_reg_response_data = await _register_machine_with_keygen(license_id, fingerprint, headers)

                if machine_registration_success:
                    logger.info(f"Machine {fingerprint[:8]}... successfully registered or already registered with license ID {license_id}. Retrying validation for key {license_key[:4]}...")
                    retry_response = await asyncio.to_thread(
                        requests.post, validation_url, headers=headers, json=payload, timeout=15
                    )
                    retry_response_data = retry_response.json()
                    
                    if retry_response.status_code == 200:
                        retry_validation_meta = retry_response_data.get("meta", {})
                        retry_validation_code = retry_validation_meta.get("code")
                        if retry_validation_code == "VALID":
                            logger.info(f"License key VALID after machine registration: {license_key[:4]}...")
                            return {
                                "valid": True,
                                "data": retry_response_data.get("data"),
                                "meta": retry_validation_meta
                            }
                        else:
                            error_detail = retry_validation_meta.get("detail", "Validation failed after machine registration.")
                            logger.error(f"Validation for key {license_key[:4]}... FAILED (Code: {retry_validation_code}) after successful machine registration: {error_detail}")
                            return {"valid": False, "error_code": retry_validation_code, "error": error_detail, "meta": retry_validation_meta}
                    else:
                        error_detail_retry = "Unknown error on retry"
                        if "errors" in retry_response_data and retry_response_data["errors"]:
                             error_detail_retry = retry_response_data["errors"][0].get("detail", "Keygen API error on retry.")
                        logger.error(f"Keygen API error (HTTP {retry_response.status_code}) on validation retry for key {license_key[:4]}...: {error_detail_retry}")
                        return {"valid": False, "error": f"Keygen API error on retry: {error_detail_retry}", "status_code": retry_response.status_code}
                else:
                    error_msg = machine_reg_response_data.get("error", "Failed to register machine with license provider.")
                    error_code_msg = machine_reg_response_data.get("error_code", "MACHINE_REGISTRATION_FAILED")
                    logger.error(f"Failed to register machine {fingerprint[:8]}... for license ID {license_id}. Error: {error_msg}")
                    return {"valid": False, "error_code": error_code_msg, "error": error_msg, "meta": validation_meta} 
            else:
                error_detail = validation_meta.get("detail", "License key is not valid.")
                logger.warning(f"License key {validation_code}: {license_key[:4]}... Detail: {error_detail}")
                return {"valid": False, "error_code": validation_code, "error": error_detail, "meta": validation_meta}
        else:
            error_detail_initial = "Unknown error"
            if "errors" in response_data and response_data["errors"]:
                error_detail_initial = response_data["errors"][0].get("detail", "Keygen API error.")
            logger.error(f"Keygen API error (HTTP {response.status_code}): {error_detail_initial} for key {license_key[:4]}...")
            return {"valid": False, "error": f"Keygen API error: {error_detail_initial}", "status_code": response.status_code}

    except requests.exceptions.Timeout:
        logger.error(f"Timeout while validating license key: {license_key[:4]}...")
        return {"valid": False, "error": "Timeout connecting to license server."}
    except requests.exceptions.RequestException as e:
        logger.error(f"RequestException while validating license key {license_key[:4]}...: {e}")
        return {"valid": False, "error": f"Error connecting to license server: {str(e)}"}
    except Exception as e:
        logger.error(f"Unexpected error in validate_license_key for {license_key[:4]}...: {e}", exc_info=True)
        return {"valid": False, "error": f"An unexpected server error occurred during license validation."}
