## Brief overview
- Guidelines for installing, configuring, and using the Codex CLI tool in this project.
- Focused on practical, easy-to-follow steps for setup and daily use.

## Installation & setup
- Install globally: `npm install -g @openai/codex`
- Set your OpenAI API key for the session:  
  `export OPENAI_API_KEY="your-api-key-here"`
- Alternatively, add `OPENAI_API_KEY=your-api-key-here` to a `.env` file at the project root.
- Codex loads environment variables from `.env` automatically.

## Basic usage
- Start interactive REPL: `codex`
- Run a prompt directly:  
  `codex "your prompt here"`
- Use full auto mode:  
  `codex --approval-mode full-auto "your task"`
- Codex will scaffold files, run code in a sandbox, install dependencies, and show results.

## Approval modes
- `suggest` (default): Only reads files, suggests changes.
- `auto-edit`: Reads and applies file changes, asks before running shell commands.
- `full-auto`: Reads/writes files and runs shell commands (network disabled, sandboxed).

## Configuration
- Place config in `~/.codex/config.yaml` or `~/.codex/config.json`.
- Key options:  
  - `model`: AI model to use (e.g., `o4-mini`)
  - `approvalMode`: Permission mode (`suggest`, `auto-edit`, `full-auto`)
  - `notify`: Enable/disable desktop notifications
- Example config:
  ```json
  {
    "model": "o4-mini",
    "approvalMode": "suggest",
    "notify": true
  }
  ```

## Project & agent guidance
- Add extra instructions in `AGENTS.md` at repo root or `~/.codex/AGENTS.md`.
- Example:  
  - "Always respond with emojis"
  - "Only use git commands when explicitly requested"

## Security & sandboxing
- On macOS 12+: Uses Apple Seatbelt for sandboxing (read-only except workdir, no outbound network).
- On Linux: Use Docker for sandboxing (see `run_in_container.sh`).
- Never run `sudo npm install -g`; fix npm permissions instead.

## Common commands & recipes
- Refactor code:  
  `codex "Refactor the Dashboard component to React Hooks"`
- Generate migrations:  
  `codex "Generate SQL migrations for adding a users table"`
- Write tests:  
  `codex "Write unit tests for utils/date.ts"`
- Bulk rename:  
  `codex "Bulk-rename *.jpeg -> *.jpg with git mv"`
- Explain code:  
  `codex "Explain what this regex does: ^(?=.*[A-Z]).{8,}$"`

## Troubleshooting & tips
- For verbose logging: `DEBUG=true codex`
- For CI/non-interactive:  
  `codex -a auto-edit --quiet "your task"`
- If using Zero Data Retention (ZDR), update Codex to the latest version if errors occur.

## Contribution & community
- File issues, feature requests, or PRs to help improve Codex.
- Sign the CLA in PRs:  
  Comment `I have read the CLA Document and I hereby sign the CLA`

## Other guidelines
- Codex is experimental; expect breaking changes and report bugs.
- For help, open a Discussion or relevant issue in the Codex repo.
