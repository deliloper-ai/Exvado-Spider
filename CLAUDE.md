# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev      # Start development server
npm run build    # Production build
npm start        # Start production server
npm run lint     # Run ESLint
```

No test framework is currently configured.

To add a new shadcn component: `npx shadcn@latest add <component>`

## Environment Variables

- `NEXT_PUBLIC_API_URL` — Backend API base URL (default: `http://localhost:4000`)

## Architecture Overview

**Exvado-Spider** is a Turkish-language (`lang="tr"`) e-commerce admin panel for managing products, suppliers, orders, inventory, and analytics across multiple marketplaces (Trendyol, Hepsiburada, N11, BolBolBul).

### Tech Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** + **shadcn/ui** (new-york style, neutral base, `rsc: true`) + **Radix UI** primitives
- **react-hook-form** + **Zod** for form state and validation
- **Axios** for HTTP — centralized client at `lib/api/client.ts`
- **Recharts** for charts, **Fabric.js** for image editor canvas, **xlsx** for Excel export
- **@dnd-kit** for drag & drop (category/brand reordering)
- **next-themes** for dark mode
- **Inter** font (Google Fonts)

### Path Aliases

`@/*` maps to the project root (e.g., `@/components`, `@/lib`, `@/hooks`).

### API Client & Service Layer

**Client** (`lib/api/client.ts`): Axios instance with Bearer token auto-attach, 60s timeout, and response interceptors (401 → redirect to `/login`, 403/409/500 handling). Provides `api.get()`, `api.post()`, `api.put()`, `api.patch()`, `api.delete()`, `api.upload()`.

**Two API patterns coexist** (both re-exported from `lib/api/index.ts`):

1. **Service objects** (`lib/api/*.service.ts`) — CRUD methods on an exported object (e.g., `productService.getAll()`, `categoryService.create()`). Used for most pages. Typed with interfaces from `lib/api/types.ts`.

2. **API module namespaces** (`lib/api/products.ts`, `categories.ts`, etc.) — standalone functions exported as namespaces (e.g., `productsApi.getProducts()`, `categoriesApi.getCategoryTree()`). Used in some pages for variant/integration operations.

Import everything from the central barrel: `import { productService, productsApi, api } from "@/lib/api"`.

### Authentication

JWT token-based auth managed via `lib/auth.ts`:
- `authAPI` — login, register, forgot/reset password, getCurrentUser, logout
- `tokenManager` / `userManager` — localStorage + cookie (7-day) storage
- No middleware-based route protection; 401 interceptor handles unauthorized access
- SSR-safe: all localStorage/cookie access guarded with `typeof window !== 'undefined'`

### Page Component Pattern

All admin pages follow this structure:

```tsx
"use client"

import { MainLayout } from "@/components/layout/main-layout"
// ...

export default function PageName() {
  // useState, useEffect with service calls, handlers
  return (
    <MainLayout>
      {/* Page content using Card, Table, Dialog, etc. */}
    </MainLayout>
  )
}
```

Auth pages (`/login`, `/register`, etc.) do NOT use `MainLayout`.

### Layout Structure

- `components/layout/main-layout.tsx` — sidebar + header + content wrapper (used by all admin pages)
- `components/layout/sidebar.tsx` — collapsible nav, 260px expanded / 70px collapsed
- `components/layout/header.tsx` — search bar, notification dropdowns, user menu

### Page Routes

- **Auth:** `/login`, `/register`, `/password-reset`, `/verification`
- **Dashboard:** `/` — sales metrics, inventory overview, cron sync status
- **Sync:** `/cron-sync`, `/db-sync`, `/xml-sync`
- **Products:** `/products`, `/products/edit/[id]`, `/inventory`, `/categories`, `/brands`, `/specifications`, `/desi`
- **Suppliers:** `/supplier-rates`, `/supplier-logs`
- **Orders:** `/orders`, `/order-questions`
- **Reports:** `/sales-reports`, `/product-reports`, `/growth-reports`, `/product-comparison`
- **Settings:** `/settings`, `/email-settings`, `/activity-logs`

### Styling Conventions

- OKLch color system with CSS variables for light/dark themes (defined in `app/globals.css`)
- Custom utility classes: `.glass`, `.gradient-primary`, `.gradient-subtle`, `.shadow-soft`, `.shadow-colored`
- Status classes: `.status-success`, `.status-warning`, `.status-error`, `.status-info`
- Use `cn()` from `lib/utils.ts` (clsx + tailwind-merge) for conditional class merging
- Print styles available via `.print-content` / `.no-print` classes

### Toast Notifications

Custom `useToast` hook at `hooks/use-toast.ts` (not Sonner, despite it being in dependencies):

```tsx
const { toast } = useToast()
toast({ title: "Success", description: "Item created" })
toast({ title: "Error", description: "Failed", variant: "destructive" })
```

### Utilities

`lib/utils.ts` exports:
- `cn(...classes)` — Tailwind-safe class merging
- `formatDate(date)` — formats to `DD.MM.YYYY` (Turkish date format)

### State Management

- Per-component `useState` — no global store
- Data fetching via direct service calls in `useEffect` — no SWR/React Query
- Form state via `react-hook-form` with Zod resolvers

### Webpack Overrides (next.config.ts)

- `fs` module disabled for client-side bundles
- WASM/ONNX warnings suppressed for `@imgly/background-removal` and `onnxruntime-web`
