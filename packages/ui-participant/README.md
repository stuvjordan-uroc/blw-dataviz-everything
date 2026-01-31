# UI Participant

Poll participant interface for the BLW Dataviz polling application.

## Overview

This is a Vite + React + TypeScript SPA that provides the participant-facing interface for taking polls and viewing results.

## Dependencies

- **@blw-dataviz/ui-shared** - Shared design system (colors, typography, components)
- **@blw-dataviz/polls-participant-utils** - Participant utilities and business logic

## Development

```bash
# Install dependencies (from monorepo root)
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
  ├── main.tsx          # Application entry point
  ├── App.tsx           # Root component
  ├── components/       # UI components
  ├── pages/            # Page components
  ├── hooks/            # Custom React hooks
  └── utils/            # Utility functions
```

## Features

- Poll participation interface
- Real-time results visualization
- Responsive design using ui-shared components
- Type-safe with TypeScript
