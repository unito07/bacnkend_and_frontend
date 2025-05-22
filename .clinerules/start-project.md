## Brief overview
- This rule specifies that only local hosts should be opened for development and testing, as all necessary dependencies are assumed to be pre-installed on the local machine.

## Development workflow
- When running applications or services, always use local host URLs (e.g., `http://localhost:3000`, `http://127.0.0.1:8000`).
- Avoid attempting to access external network resources or remote hosts for development purposes.

## Project context
- All project dependencies are expected to be installed and configured on the local development machine.
- Network operations should be confined to the local environment unless explicitly required for a specific feature.
