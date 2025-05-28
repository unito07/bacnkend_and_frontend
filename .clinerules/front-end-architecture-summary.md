## Brief overview
This file summarizes the front-end project structure, technologies, and styling approach for the web scraper application. It is based on an initial analysis of the `front-end-react` directory.

## Project Setup
- **Build Tool**: Vite
- **Framework**: React
- **Key Dependencies**:
    - `tailwindcss`: For utility-first CSS.
    - `@radix-ui/*`: Core components, often used by Shadcn UI.
    - `lucide-react`: For icons.
    - `react-router-dom`: For routing.
    - `sonner`: For toast notifications.
    - `class-variance-authority`, `clsx`, `tailwind-merge`: Utilities for styling.
- **Path Aliasing**: `@/` is configured to point to the `src/` directory.

## Styling Approach
- Styling is predominantly done using **Tailwind CSS utility classes** directly in the JSX.
- The project already incorporates **Shadcn UI components** (e.g., `Input`, `Button`, `Label` from `src/components/ui/`).
- Magic UI components are also used for more distinct visual elements (e.g., `Dock` in `Navbar.jsx`).

## Global Setup
- **Global CSS**: `src/index.css` imports Tailwind's base, components, and utilities. It also defines a comprehensive "Cyberpunk Theme" using CSS custom properties, which are used for colors, spacing (radius), etc. This theme is applied globally.
- **Entry Point**: `src/main.jsx` imports `src/index.css` and wraps the main `App` component with `ScraperFormProvider` (likely for managing form-related state globally).
- **App Layout**: `src/App.jsx` uses `react-router-dom` for navigation, includes a global `Navbar`, and a `main` content wrapper styled with Tailwind CSS. It also includes a `Toaster` for notifications.

## Conclusion
The front-end is a Vite-based React application that heavily relies on Tailwind CSS for styling. It has already adopted Shadcn UI for its core UI components and has a well-defined theming system using CSS custom properties in `src/index.css`. This setup is conducive to adding more Shadcn UI components or custom components styled with Tailwind CSS, following the established patterns.
