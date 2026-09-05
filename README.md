# Futurelab Wiki

**A collaborative workspace for ideas, projects, assets, knowledge, and team activity.**

Futurelab Wiki is an internal workspace designed to bring the work surrounding a creative team into one connected system.

Instead of separating ideas, project work, brand assets, documentation, comments, and team activity across disconnected tools, Futurelab Wiki connects them through a shared workspace.

The goal is simple:

> **Turn ideas into work, work into knowledge, and knowledge into reusable creative assets.**

---

## What it does

Futurelab Wiki provides a shared environment for teams to:

* Capture and develop **ideas**
* Turn ideas into **projects**
* Organize project **tasks and milestones**
* Store and manage **creative assets**
* Build structured **knowledge and wiki pages**
* Save and follow important content
* Comment, reply, and mention teammates
* Vote on ideas and surface community signals
* Track activity across the workspace
* Search across the workspace
* Curate featured collections and library content
* Manage workspace content through administrative tooling

The application is built around a connected workflow rather than a collection of isolated CRUD screens.

### The core model

```text
Idea
  ↓
Project
  ↓
Work
  ├── Tasks
  ├── Milestones
  └── Activity
        ↓
Assets ─────────────┐
                    │
Wiki / Knowledge ───┤
                    │
Comments / Mentions ─┘
```

This relationship is central to the product.

Ideas provide direction. Projects turn that direction into execution. Assets support the work. Wiki pages preserve the knowledge created along the way.

---

# Product principles

Futurelab Wiki is designed around a few principles.

### One workspace

Important creative and operational context should live together instead of being scattered across unrelated tools.

### Ideas should become actionable

An idea should not disappear into an endless backlog. The workspace makes it possible to move from an idea into an actual project.

### Knowledge should compound

Completed work should leave behind useful documentation, decisions, assets, and context that the team can reuse.

### Collaboration should be visible

Comments, mentions, votes, follows, saves, and activity provide lightweight collaboration without turning the workspace into another noisy social network.

### The interface should stay out of the way

The visual system uses a restrained Futurelab Studios aesthetic: monochrome foundations, generous spacing, strong typography, subtle surfaces, and carefully controlled pastel accents.

---

# Architecture

The application is a modern React and Supabase application.

```text
┌─────────────────────────────────────────────┐
│                 React App                   │
│                                             │
│  Pages                                       │
│    ↓                                         │
│  Feature Components                          │
│    ↓                                         │
│  Hooks / Domain Operations                   │
│    ↓                                         │
│  Supabase Client + RPCs                     │
└──────────────────────┬──────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────┐
│                 Supabase                    │
│                                             │
│  PostgreSQL                                 │
│  Row Level Security                         │
│  Database Functions / RPCs                  │
│  Storage                                    │
│  Authentication                             │
└─────────────────────────────────────────────┘
```

The client handles presentation and user interaction.

Database policies and server-side database functions are responsible for enforcing data access and mutation rules.

Client-side permission checks are therefore treated as UX concerns, not security boundaries.

---

# Tech stack

## Application

* **React 19**
* **TypeScript**
* **Vite**
* **React Router**
* **Tailwind CSS**
* **Radix UI**
* **Lucide React**

## Data and backend

* **Supabase**
* **PostgreSQL**
* **Supabase Storage**
* **Supabase RPCs**
* **Row Level Security**

## Content

* **Marked** for Markdown rendering
* **DOMPurify** for sanitization

## Testing

* **Vitest** for unit tests
* **Playwright** for browser-based end-to-end tests

## Tooling

* **Node.js**
* **npm**
* **GitHub Actions**

---

# Project structure

The repository is organized around application features and domain responsibilities.

```text
.
├── .github/
│   └── workflows/
│       └── ci.yml
│
├── e2e/
│   └── critical-paths.spec.ts
│
├── scripts/
│   └── check-bundle-size.mjs
│
├── src/
│   ├── components/
│   │   ├── assets/
│   │   ├── comments/
│   │   ├── layout/
│   │   ├── projects/
│   │   ├── search/
│   │   └── ...
│   │
│   ├── hooks/
│   │   ├── useAssets.ts
│   │   ├── useComments.ts
│   │   ├── useNotifications.ts
│   │   ├── useProjectMembers.ts
│   │   ├── useProjectMilestones.ts
│   │   ├── useProjectTodos.ts
│   │   └── ...
│   │
│   ├── lib/
│   │   ├── activity.ts
│   │   ├── pagination.ts
│   │   ├── file-selection.ts
│   │   └── ...
│   │
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── Assets.tsx
│   │   ├── Ideas.tsx
│   │   ├── Projects.tsx
│   │   ├── Wiki.tsx
│   │   └── ...
│   │
│   └── styles/
│       └── globals.css
│
├── supabase/
│   ├── migrations/
│   └── schema.sql
│
├── .env.example
├── package.json
├── playwright.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── vite.config.ts
└── README.md
```

The exact structure may evolve as the application matures. The important boundary is between presentation, feature/domain logic, and database operations.

---

# Core workflows

## Idea → Project

Ideas can move beyond a passive backlog and become active projects.

A project provides the structure for:

* Members
* Tasks
* Milestones
* Activity
* Related work
* Project progress

The transition from idea to project is designed to be transactional so that partial creation does not leave inconsistent records behind.

---

## Project execution

Projects support lightweight execution through:

* Todo items
* Milestones
* Status tracking
* Team membership
* Activity history

Mutating operations are guarded against duplicate or conflicting actions where necessary.

---

## Asset management

Assets provide a central library for creative resources.

The asset workflow supports:

* Uploading files
* Folder selection
* Collections
* Saved assets
* Featured collections
* Asset discovery
* Server-side pagination

Large file selections are bounded to prevent accidental browser or upload overload.

---

## Wiki and knowledge

The Wiki provides persistent documentation for the workspace.

Wiki pages support:

* Creating pages
* Editing pages
* Markdown content
* Revision history
* Revision comparison
* Search and navigation

Revision comparison uses line-based diffing rather than treating revisions as unrelated documents.

---

## Collaboration

Collaboration features include:

* Comments
* Replies
* Mentions
* Notifications
* Follows
* Saves
* Voting
* Activity history

Mutations are designed to surface failures rather than silently pretending that a failed operation succeeded.

---

# Search

Global search provides workspace-wide discovery across supported entities.

Search is designed around:

* Server-side querying
* Pagination
* Result limits
* Entity-aware results
* Request sequencing
* Protection against stale responses

Search should remain useful as the amount of workspace content grows rather than depending on loading the entire dataset into the browser.

---

# Data architecture

The database schema is maintained in:

```text
supabase/schema.sql
```

Incremental changes live in:

```text
supabase/migrations/
```

Migrations should be applied in filename order and should be treated as the authoritative history of database changes.

Database functions are used for operations where consistency matters across multiple records.

Examples include:

* Creating ideas without title races
* Creating project milestones safely
* Reordering milestones
* Creating comments with mentions
* Updating comments and mentions atomically
* Search operations
* Other domain-level mutations

This keeps important consistency rules close to the data rather than relying entirely on client-side coordination.

---

# Error handling

The application distinguishes between successful and attempted mutations.

A failed database or storage operation should not result in the UI displaying a false success state.

Mutation hooks therefore generally follow this pattern:

```text
User action
    ↓
Lock / guard mutation
    ↓
Database or storage operation
    ↓
Success ──────→ update local state
    │
    └── Failure → preserve state + surface error
```

Non-critical activity recording is intentionally isolated from the primary user operation. A failure to record an activity event should not make an otherwise successful business operation appear to have failed.

---

# Performance

The application uses several techniques to keep the client responsive:

* Server-side pagination
* Targeted database queries
* Limited initial result sets
* Production bundle splitting
* Lazy or bounded data access where appropriate
* Controlled file selection
* Bounded upload concurrency
* Efficient revision diffing
* Bundle-size checks in CI

Performance should be measured with real application metrics rather than inferred from bundle size alone.

---

# Accessibility

Accessibility is treated as a product requirement rather than a final cleanup task.

The application aims to provide:

* Semantic HTML
* Keyboard-accessible controls
* Visible focus states
* Appropriate button and input labels
* Accessible dialogs and interactive controls
* Reduced-motion support
* Clear loading, error, and empty states
* Sufficient text contrast

Future accessibility work should be validated against WCAG 2.2 AA rather than relying solely on visual inspection.

---

# Design system

Futurelab Wiki follows the Futurelab Studios visual direction.

The visual system is intentionally restrained.

### Foundation

* White and soft-grey surfaces
* Near-black typography
* Subtle borders
* Generous spacing
* Rounded surfaces
* Soft shadows

### Typography

* **Space Grotesk** for headings
* **Inter** for body copy and interface elements

### Pastel accents

Pastels are reserved for semantic or interactive emphasis.

```text
Pink    #FAD9DB
Green   #CCF0DC
Blue    #D6E8F8
Purple  #E5D9F7
Yellow  #FBF0CC
```

Pastels should not become arbitrary decorative backgrounds throughout the interface.

The primary visual language remains monochrome.

---

# Development

## Requirements

* Node.js 20+
* npm
* A Supabase project

## Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Configure the required Supabase client values in `.env`.

Never commit production credentials.

---

# Installation

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

The Vite development server will provide the local application URL.

---

# Available commands

### Development

```bash
npm run dev
```

Starts the local development server.

### Type checking

```bash
npm run typecheck
```

Runs TypeScript without emitting build output.

### Unit tests

```bash
npm test
```

Runs the Vitest test suite.

### End-to-end tests

```bash
npm run test:e2e
```

Runs the Playwright browser test suite.

### Production build

```bash
npm run build
```

Runs the production TypeScript build and Vite bundle.

### Bundle budget

```bash
npm run check:bundle
```

Checks the production output against configured bundle-size budgets.

### Preview

```bash
npm run preview
```

Serves the production build locally.

---

# Testing strategy

The project uses multiple levels of automated verification.

```text
                 ┌───────────────┐
                 │   Unit Tests  │
                 └───────┬───────┘
                         │
                 ┌───────▼───────┐
                 │  Integration  │
                 └───────┬───────┘
                         │
                 ┌───────▼───────┐
                 │     E2E       │
                 └───────┬───────┘
                         │
                 ┌───────▼───────┐
                 │ Production    │
                 │    Build      │
                 └───────────────┘
```

Unit tests should cover deterministic business logic and reusable utilities.

Integration tests should verify interactions with the database and Supabase operations.

End-to-end tests should cover the workflows that matter most to users, particularly:

* Authentication
* Creating an idea
* Converting an idea into a project
* Project execution
* Asset management
* Wiki creation/editing
* Collaboration
* Search

---

# Continuous integration

GitHub Actions is used to validate changes before they are considered production-ready.

The CI pipeline validates:

* Dependency installation
* TypeScript
* Unit tests
* Production builds
* Bundle-size budgets
* Browser-based critical paths

The objective is not simply to make CI green.

The objective is to prevent broken application behavior from reaching the main branch.

---

# Database development

Database changes should follow these rules:

1. Modify the schema through a migration.
2. Give migrations an ordered filename.
3. Keep migrations deterministic.
4. Keep important cross-record mutations inside database functions when atomicity is required.
5. Update the base schema when appropriate for new environments.
6. Test important database behavior independently from the UI.
7. Never rely on client-side permission checks for authorization.

The database is part of the application architecture, not merely storage behind it.

---

# Production principles

Before a release is considered production-ready, the following should be true:

* TypeScript passes
* Unit tests pass
* Integration tests pass
* Critical E2E workflows pass
* Production build succeeds
* Bundle budgets pass
* Database migrations are applied
* Environment configuration is validated
* Error states are recoverable
* Accessibility has been checked
* Performance has been measured
* Observability is available for important failures
* No known P0/P1 defects remain

A green build is necessary.

It is not the definition of quality.

---

# Security and authorization

Authentication and authorization are enforced through Supabase.

The application follows an important boundary:

> **The browser can decide what to display. The database decides what the user is allowed to do.**

Supabase policies and server-side database functions are therefore the authoritative enforcement layer.

Real credentials, service-role keys, and other secrets must never be committed to the repository.

---

# Contributing

When contributing to Futurelab Wiki:

1. Keep changes focused.
2. Prefer existing domain patterns before introducing new abstractions.
3. Keep database mutations atomic where consistency requires it.
4. Do not duplicate business rules across multiple UI components.
5. Preserve loading, error, and empty states.
6. Add tests for meaningful behavior changes.
7. Run type checking and tests before opening a pull request.
8. Update database migrations when changing persisted behavior.
9. Keep the visual system consistent with the Futurelab design language.
10. Avoid introducing dependencies unless they solve a real problem.

The goal is not maximum abstraction.

The goal is a system that remains understandable six months after everyone has forgotten why a particular component was created.

---

# Project status

Futurelab Wiki is under active development.

The application is moving toward an enterprise-grade internal workspace with stronger testing, scalability, accessibility, observability, and operational tooling.

The long-term quality bar is:

* Reliable core workflows
* Predictable data consistency
* Fast navigation and search
* Accessible interfaces
* Maintainable domain architecture
* Strong automated coverage
* Observable production behavior
* Clear operational documentation

---

# License

This project is private and intended for internal Futurelab use.

---

## Philosophy

Futurelab Wiki is not intended to become another generic project-management dashboard.

Its purpose is to connect **thinking, making, documenting, and reusing** in one workspace.

The best version of the product should make the relationship between those things feel obvious:

```text
Think
  ↓
Idea
  ↓
Project
  ↓
Make
  ↓
Assets + Work
  ↓
Document
  ↓
Knowledge
  ↓
Reuse
```

The software should make that loop easier, not add another layer of administrative work around it.
