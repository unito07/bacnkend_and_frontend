## Brief overview
This file outlines the preferred technologies and architectural choices for the front-end of the web scraper project. It aims to provide a comprehensive guide for front-end development, ensuring consistency and maintainability.

## Preferred Tech Stack
- **Framework/Library**: React (using Vite as the build tool). React is chosen for its component-based architecture, large community, and ecosystem. Vite is used as the build tool for its speed and ease of use.
- **Styling**: Tailwind CSS. Tailwind CSS is preferred for its utility-first approach, which allows for rapid UI development and consistent styling.
- **UI Components**:
    - **Shadcn UI**: Utilized for core UI elements like buttons, inputs, labels, checkboxes. These are typically found in `src/components/ui/`. **One-time install per dependency:** You only need to install the required packages once. For example, when adding a ShadCN UI component (like a button), it may prompt you to install @radix-ui/react-button, tailwind-variants, etc. Once these are installed, you don’t need to re-download them unless:
        - You're adding a component that depends on a new package.
    - **Magic UI**: A collection of animated or visually distinct components, likely found in `src/components/magicui/`. Magic UI components are used to add visual flair and enhance the user experience.
- **Routing**: `react-router-dom` for client-side navigation. `react-router-dom` is used for its declarative approach to routing and its ability to create single-page applications.

## Key Components
- `StaticScraper.jsx` and `DynamicScraper.jsx`: Core components for interacting with the backend scraping functionalities. These components provide the UI for configuring and initiating static and dynamic scraping tasks, respectively.
- `Results.jsx`: Displays scraped data and provides download options (JSON, CSV). This component is responsible for rendering the scraped data in a tabular format and allowing the user to download the data in various formats.

## State Management
- `useState` for local component state. `useState` is used for managing the state of individual components, such as the loading state and any errors.
- `ScraperFormContext` for managing form data across components, with persistence in `localStorage`. The `ScraperFormContext` provides a centralized way to manage the form data for both the `StaticScraper` and `DynamicScraper` components. It also persists the form data in `localStorage` so that it is persisted between sessions.

## Coding Conventions
- Use functional components and hooks. Functional components and hooks are preferred for their simplicity and testability.
- Follow a consistent component structure. A consistent component structure makes it easier to understand and maintain the codebase.
- Use descriptive variable and function names. Descriptive variable and function names improve code clarity and understanding.
- Add comments to explain complex logic. Comments are added to explain complex or non-obvious logic. This helps other developers (and yourself) understand the code's purpose and functionality.
