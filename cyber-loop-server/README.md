# Cyber Loop Server

This document outlines the folder structure and architecture of the `cyber-loop-server`.

## Folder Structure

```text
cyber-loop-server/
├── data/                  # SQLite database file is stored here locally `.db`
├── src/                   # Source code
│   ├── config/            # Environment configurations & database connection setups
│   ├── controllers/       # Route request handlers (e.g., Auth, Game)
│   ├── db/                # Database schema (schema.sql) and seeding scripts (seed.ts)
│   ├── game/              # Core game logic/engine
│   ├── middleware/        # Express custom middlewares (e.g., authentication check)
│   ├── routes/            # API Route definitions (e.g., /api/auth, /api/game)
│   ├── services/          # Business logic abstracting complex operations from controllers
│   └── server.ts          # Main application entry point that starts the server
├── uploads/               # Directory for storing any uploaded files (if configured)
├── .env.example           # Example environment variables template
├── package.json           # Node.js dependencies and scripts commands
├── tsconfig.json          # TypeScript configuration
└── vitest.config.ts       # Vitest testing configuration
```

## Architecture Flow

1. **Routes (`src/routes`)**: Define the API endpoints and map them to specific controllers.
2. **Middleware (`src/middleware`)**: Intercept requests to perform checks like verifying JWT tokens or handling file uploads.
3. **Controllers (`src/controllers`)**: Handle the incoming HTTP requests, extract parameters/body, and call the appropriate services.
4. **Services (`src/services`) / Game (`src/game`)**: Contain the core business and game logic. They interact with the database.
5. **Database (`src/db` & `src/config`)**: Manage data persistence using the configured database client (SQLite).
