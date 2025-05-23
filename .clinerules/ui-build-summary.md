## Brief overview
- This document outlines the comprehensive UI build and styling approach for the `web-scrapper` project, focusing on modern React development with integrated styling solutions.

## UI Architecture
- The frontend is built with **React**, leveraging its component-based architecture for modular and maintainable UI development.
- **Vite** serves as the development server and build tool, providing a fast and efficient development experience.
- **ShadCN UI components** are prioritized for a modern, accessible, and consistent look and feel, providing pre-built, customizable UI primitives.
- **Tailwind CSS** is utilized for utility-first styling, enabling rapid UI development, responsive design, and efficient management of visual styles directly within JSX.
- **Modern React Practices**: The architecture emphasizes functional components and React Hooks (`useState`, `useEffect`, `useContext`, `useRef`) for state management, side effects, and efficient component logic. The Context API is used for global state management where appropriate, reducing prop drilling.

## Styling Preferences & Best Practices

### 1. Utility-First Styling with Tailwind CSS
- **Direct Application**: Apply Tailwind CSS utility classes directly to JSX elements for granular control over styling.
  ```jsx
  <div className="flex items-center justify-center bg-blue-500 text-white p-4 rounded-lg shadow-md">
    Hello Tailwind!
  </div>
  ```
- **Conditional Styling**: Use JavaScript logic (e.g., template literals, `clsx` or `classnames` utility) to apply classes conditionally based on component state or props.
  ```jsx
  import { useState } from 'react';
  import { cn } from '@/lib/utils'; // Assuming cn utility from ShadCN

  function MyButton({ isActive }) {
    return (
      <button
        className={cn(
          "py-2 px-4 rounded-md transition-colors duration-200",
          isActive ? "bg-indigo-600 text-white hover:bg-indigo-700" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
        )}
      >
        Click Me
      </button>
    );
  }
  ```
- **Avoiding Dynamic Class Construction**: Ensure Tailwind can detect all classes by avoiding dynamic string concatenation that prevents the JIT compiler from finding full class names (e.g., `bg-${color}-500`). Instead, use full class names or map them to predefined variants.
  ```jsx
  // Correct: Full class names are present
  const buttonColors = {
    primary: "bg-blue-600 hover:bg-blue-500",
    secondary: "bg-gray-600 hover:bg-gray-500",
  };
  <button className={buttonColors[type]}>...</button>
  ```

### 2. ShadCN UI Theming and Customization
- **CSS Variables**: ShadCN UI components are styled using CSS variables defined in `src/index.css`. These variables control colors, fonts, and other visual properties for both light and dark modes.
- **Theming Alignment**: To align ShadCN's theme with custom brand colors defined in `tailwind.config.js`, update the corresponding CSS variables in `src/index.css`. Convert HEX values from `tailwind.config.js` to OKLCH format if maintaining ShadCN's default color space.
  ```css
  /* In src/index.css */
  :root { /* Light theme */
    --primary: oklch(50% 0.15 250); /* Example OKLCH value for a custom primary */
    /* ... other ShadCN variables */
  }
  .dark { /* Dark theme */
    --primary: oklch(70% 0.15 250); /* Example OKLCH value for dark mode primary */
    /* ... other ShadCN variables */
  }
  ```

### 3. Responsive Design
- Utilize Tailwind's responsive utility prefixes (e.g., `sm:`, `md:`, `lg:`) to ensure components adapt gracefully across various screen sizes.

### 4. Accessibility
- Prioritize accessible UI development. ShadCN UI components are built with accessibility in mind. When building custom components, ensure proper ARIA attributes and keyboard navigation. Consider using libraries like **Headless UI** for unstyled, accessible components that integrate well with Tailwind.

## Component Development Workflow
1.  **Design First**: Sketch out the component's structure and intended behavior.
2.  **ShadCN Integration**: Check if a suitable ShadCN UI component exists. If so, use it as a base and customize its appearance via `src/index.css` variables or by extending its classes with Tailwind.
3.  **Tailwind Styling**: Apply Tailwind utility classes directly to JSX elements for styling. For complex components, consider creating small, focused utility components or using `cn` (from `src/lib/utils.ts`) for conditional class merging.
4.  **State Management**: Use React Hooks (`useState`, `useReducer`, `useContext`) to manage component state and data flow.
5.  **Modularity**: Keep components small, focused, and reusable.

## Known Issues & Troubleshooting

### Persistent PostCSS Error
- **Problem**: Tailwind CSS styles are currently not applying correctly in the browser, and the Vite development server consistently reports a PostCSS error:
  ```
  [postcss] It looks like you're trying to use `tailwindcss` directly as a PostCSS plugin. The PostCSS plugin has moved to a separate package, so to continue using Tailwind CSS with PostCSS you'll need to install `@tailwindcss/postcss` and update your PostCSS configuration.
  ```
- **Impact**: The UI appears unstyled in the browser, significantly hindering development and user experience.
- **Resolution Strategy**:
    1.  **Verify `@tailwindcss/postcss`**: Ensure `@tailwindcss/postcss` is installed as a dev dependency in `front-end-react/package.json`. If not, install it: `npm install -D @tailwindcss/postcss`.
    2.  **Update `postcss.config.cjs`**: Modify `front-end-react/postcss.config.cjs` to explicitly use `@tailwindcss/postcss` as recommended by the error message.
        ```javascript
        // front-end-react/postcss.config.cjs
        module.exports = {
          plugins: {
            '@tailwindcss/postcss': {}, // Use the new package
            autoprefixer: {},
          },
        };
        ```
    4.  **Version Compatibility Check**: If the issue persists, investigate specific version compatibility between `vite`, `tailwindcss`, `postcss`, and `autoprefixer`. Refer to their official documentation for known issues or recommended versions.
