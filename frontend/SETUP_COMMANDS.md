# Project Setup Commands

This document contains all the commands needed to set up the frontend project locally.

## Prerequisites

Make sure you have Node.js (v18 or higher) and npm/pnpm installed on your system.

## Installation Commands

### 1. Install Dependencies

Choose one of the following package managers:

#### Using npm (recommended)
```bash
npm install
```

#### Using pnpm
```bash
pnpm install
```

### 2. shadcn/ui Setup

This project uses shadcn/ui components. Here's how to set it up:

#### Initialize shadcn/ui (if starting from scratch)
```bash
npx shadcn@latest init
```

#### Install Individual shadcn/ui Components
```bash
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add badge
npx shadcn@latest add input
npx shadcn@latest add label
npx shadcn@latest add select
npx shadcn@latest add textarea
npx shadcn@latest add checkbox
npx shadcn@latest add radio-group
npx shadcn@latest add switch
npx shadcn@latest add slider
npx shadcn@latest add tabs
npx shadcn@latest add accordion
npx shadcn@latest add alert-dialog
npx shadcn@latest add avatar
npx shadcn@latest add dropdown-menu
npx shadcn@latest add dialog
npx shadcn@latest add popover
npx shadcn@latest add tooltip
npx shadcn@latest add progress
npx shadcn@latest add scroll-area
npx shadcn@latest add separator
npx shadcn@latest add toast
npx shadcn@latest add toggle
npx shadcn@latest add toggle-group
npx shadcn@latest add aspect-ratio
npx shadcn@latest add collapsible
npx shadcn@latest add context-menu
npx shadcn@latest add hover-card
npx shadcn@latest add menubar
npx shadcn@latest add navigation-menu
```

### 3. Manual Package Installation Commands

If you need to install packages individually, here are all the commands:

#### Core Framework & React
```bash
npm install next@16.1.6 react@19.2.4 react-dom@19.2.4
```

#### TypeScript & Type Definitions
```bash
npm install --save-dev typescript@5.7.3 @types/node@^22 @types/react@19.2.14 @types/react-dom@19.2.3
```

#### shadcn/ui Dependencies (installed automatically by shadcn)
```bash
npm install @radix-ui/react-accordion@1.2.12
npm install @radix-ui/react-alert-dialog@1.1.15
npm install @radix-ui/react-aspect-ratio@1.1.8
npm install @radix-ui/react-avatar@1.1.11
npm install @radix-ui/react-checkbox@1.3.3
npm install @radix-ui/react-collapsible@1.1.12
npm install @radix-ui/react-context-menu@2.2.16
npm install @radix-ui/react-dialog@1.1.15
npm install @radix-ui/react-dropdown-menu@2.1.16
npm install @radix-ui/react-hover-card@1.1.15
npm install @radix-ui/react-label@2.1.8
npm install @radix-ui/react-menubar@1.1.16
npm install @radix-ui/react-navigation-menu@1.2.14
npm install @radix-ui/react-popover@1.1.15
npm install @radix-ui/react-progress@1.1.8
npm install @radix-ui/react-radio-group@1.3.8
npm install @radix-ui/react-scroll-area@1.2.10
npm install @radix-ui/react-select@2.2.6
npm install @radix-ui/react-separator@1.1.8
npm install @radix-ui/react-slider@1.3.6
npm install @radix-ui/react-slot@1.2.4
npm install @radix-ui/react-switch@1.2.6
npm install @radix-ui/react-tabs@1.1.13
npm install @radix-ui/react-toast@1.2.15
npm install @radix-ui/react-toggle@1.1.10
npm install @radix-ui/react-toggle-group@1.1.11
npm install @radix-ui/react-tooltip@1.2.8
```

#### Icons (configured for shadcn/ui)
```bash
npm install lucide-react@^0.564.0
```

#### Styling & CSS (shadcn/ui setup)
```bash
npm install --save-dev tailwindcss@^4.2.0 @tailwindcss/postcss@^4.2.0 postcss@^8.5 autoprefixer@^10.4.20
npm install tailwind-merge@^3.3.1 clsx@^2.1.1 class-variance-authority@^0.7.1
npm install tw-animate-css@1.3.3
```

#### Forms & Validation
```bash
npm install react-hook-form@^7.54.1 @hookform/resolvers@^3.9.1 zod@^3.24.1
```

#### Utilities & Helper Libraries
```bash
npm install cmdk@1.1.1
npm install date-fns@4.1.0
npm install embla-carousel-react@8.6.0
npm install input-otp@1.4.2
npm install next-themes@^0.4.6
npm install react-day-picker@9.13.2
npm install react-resizable-panels@^2.1.7
npm install sonner@^1.7.1
npm install vaul@^1.1.2
```

#### Charts & Analytics
```bash
npm install recharts@2.15.0
npm install @vercel/analytics@1.6.1
```

### 3. Environment Setup

Create a `.env` file in the root directory:
```bash
cp .env.example .env
```

Then update the `.env` file with your configuration:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

## Development Commands

### Start Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

### Start Production Server
```bash
npm run start
```

### Lint Code
```bash
npm run lint
```

## Project Structure

```
frontend/
├── app/                    # Next.js App Router
├── components/             # Reusable UI components
├── lib/                    # Utility functions and configurations
├── styles/                 # Global styles
├── public/                 # Static assets
├── .env.example           # Environment variables template
├── package.json           # Dependencies and scripts
├── next.config.mjs        # Next.js configuration
├── tailwind.config.js      # Tailwind CSS configuration
└── tsconfig.json          # TypeScript configuration
```

## Quick Setup

For a complete fresh setup, run these commands in order:

```bash
# Clone the repository
git clone <repository-url>
cd frontend

# Install dependencies
npm install

# Set up environment
cp .env.example .env

# Initialize shadcn/ui (if components.json doesn't exist)
npx shadcn@latest init

# Start development server
npm run dev
```

## Notes

- This project uses Next.js 16 with the App Router
- UI components are built with **shadcn/ui** (based on Radix UI) and styled with Tailwind CSS
- The project includes TypeScript for type safety
- Icons are provided by Lucide React (configured for shadcn/ui)
- Forms use React Hook Form with Zod validation
- shadcn/ui components are located in `@/components/ui`
