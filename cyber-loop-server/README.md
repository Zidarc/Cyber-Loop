# Cyber Loop Server

This document outlines the folder structure and architecture of the `cyber-loop-server`.

## Folder Structure & Code Functionalities

```text
cyber-loop-server/
├── data/                  # SQLite database file is stored here locally (`.db` files)
├── src/                   # Source code containing all backend logic
│   ├── config/            # Environment configurations & DB connection
│   │   ├── env.ts         # Validates and exports environment variables
│   │   └── db.ts          # Initializes the SQLite database connection
│   ├── controllers/       # HTTP request handlers bridging routes to services
│   │   ├── auth.controller.ts # Handles login, registration, and logout HTTP logic
│   │   └── game.controller.ts # Manages game-related requests from clients
│   ├── db/                # Database schemas and initialization
│   │   ├── schema.sql     # SQL rules for tables (users, games, leaderboards)
│   │   ├── seed.ts        # Script to insert initial mock data
│   │   └── seed-participants.ts
│   ├── game/              # Core game mechanics
│   │   └── gameEngine.ts  # Logic for game processing and state management
│   ├── middleware/        # Express custom middlewares
│   │   ├── auth.middleware.ts  # Verifies JWTs for protected routes
│   │   └── error.middleware.ts # Global error handling
│   ├── routes/            # API Route definitions mapping URLs to controllers
│   │   ├── auth.routes.ts # Routes for /api/auth/*
│   │   └── game.routes.ts # Routes for /api/game/*
│   ├── services/          # Business logic isolating controllers from DB
│   │   ├── auth.service.ts # Password hashing, JWT generation, user verification
│   │   └── game.service.ts # Core game state changes and database updates
│   └── server.ts          # Main Express application entry point, mounts routes
├── uploads/               # Directory for storing user-uploaded files
├── .env.example           # Example environment variables template
├── package.json           # Node.js dependencies and run scripts
├── tsconfig.json          # TypeScript compilation settings
└── vitest.config.ts       # Vitest unit & integration test configuration
```

## Architecture Flow

1. **Routes (`src/routes`)**: Define the accessible API endpoints and map them to their respective controllers.
2. **Middleware (`src/middleware`)**: Intercept requests to perform authentication checks (JWT verification), input validation, and rate-limiting.
3. **Controllers (`src/controllers`)**: Parse incoming HTTP request parameters and bodies. They invoke specific services and formulate the HTTP response back to the client.
4. **Services (`src/services`) / Game (`src/game`)**: Execute the core business rules and game mechanics. They act as the only layer directly validating and submitting queries to the database.
5. **Database (`src/db` & `src/config`)**: Manage persistent data using the lightweight, fast `better-sqlite3` client.
