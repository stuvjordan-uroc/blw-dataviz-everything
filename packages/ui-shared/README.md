# UI Shared

Shared UI components, styles, and design system for the polling application.

## What's Included

- **Theme**: Type-safe color palette, spacing scale, and breakpoints
- **Components**:
  - `Header`: Sticky header with branding
  - `PageLayout`: Responsive page layout with centered content column
- **CSS Reset**: Modern CSS reset for consistent cross-browser rendering

## Technology

- **Vanilla Extract**: Type-safe CSS-in-TypeScript
- **React**: UI components
- **Vite**: Build tool

## Usage

```tsx
import { PageLayout, theme } from "ui-shared";

function App() {
  return (
    <PageLayout headerProps={{ title: "My Poll" }}>
      <h1 style={{ color: theme.colors.blue[600] }}>Welcome!</h1>
    </PageLayout>
  );
}
```

## Development

```bash
# Build the package
npm run build

# Watch mode for development
npm run dev

# Type check
npm run type-check
```

## Customizing the Theme

Edit the color palette in `src/theme/colors.ts` to match your branding.
