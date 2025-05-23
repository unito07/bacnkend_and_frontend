## Brief overview
- This rule summarizes the current UI build and styling approach for the `web-scrapper` project.

## UI Architecture
- The frontend is built with React and uses Vite as the development server and build tool.
- ShadCN UI components are prioritized for a modern look and feel.
- Tailwind CSS is used for utility-first styling.
- Styling is managed through `tailwind.config.js` for custom colors and `src/index.css` for ShadCN's CSS variables.


## Styling Preferences
- Aim for a modern and sleek UI aesthetic.
- Prioritize ShadCN UI components for consistency and visual appeal.
- Apply Tailwind CSS classes for styling, ensuring responsiveness and clean design.

## Known Issues
- Tailwind CSS styles are currently not applying correctly in the browser due to a persistent PostCSS error related to `@tailwindcss/postcss`. This issue needs to be resolved for proper styling.
