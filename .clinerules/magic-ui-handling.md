## Brief overview
- This rule outlines the preferred approach and best practices for integrating and utilizing Magic UI components within the project.

## Integration method
- Magic UI components are integrated using the `shadcn` CLI, specifically via `npx shadcn@latest add [component-url]`.
- This command downloads the component's source code directly into the project's `src/components/magicui/` directory, rather than installing them as traditional npm packages.

## Usage guidelines
- **Local Codebase:** Components become part of the local codebase, allowing for direct modification and customization.
- **Importing:** Import components as named exports from their local path (e.g., `import { ComponentName } from '@/components/magicui/component-name';`).
- **Props:** Pay attention to the specific props each Magic UI component expects (e.g., `children` for text content instead of a `text` prop, as seen with `HyperText`).
- **Styling:** Components are designed to be styled with Tailwind CSS. Utilize the `className` prop to apply or override styles using Tailwind utility classes, aligning with the project's custom theme.

## Customization and maintenance
- Since the source code is local, components can be fully customized to fit specific design or functional requirements.
- Updates to Magic UI components would involve re-running the `shadcn add` command or manually updating the local files.
