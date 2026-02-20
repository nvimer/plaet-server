# Plaet API - Project Context

## Project Overview
Plaet API is a robust, enterprise-level backend API for managing restaurant operations. It is built using Node.js, Express, TypeScript, and Prisma. The project serves as the backend for the "Plaet" application, handling core business logic, database operations, and user authentication.

**Key Technologies:**
*   **Runtime:** Node.js
*   **Framework:** Express.js
*   **Language:** TypeScript
*   **ORM:** Prisma
*   **Database:** PostgreSQL
*   **Authentication:** JWT (Passport.js), bcrypt
*   **Validation:** Zod
*   **Logging:** Winston, Morgan
*   **API Documentation:** Swagger (OpenAPI 3.0)

## Architecture & Structure
The project follows a modular, RESTful architecture with a service-repository pattern:
*   `src/api/`: Contains business modules (e.g., auth, customers, menus, orders, users), each encapsulating its routes, controllers, services, repositories, and validators.
*   `src/config/`: Configuration files for external services, logging, and environment variables.
*   `src/database/`: Database connection and Prisma setup.
*   `src/middlewares/`: Express middlewares for authentication, error handling, rate limiting, and request logging.
*   `src/app.ts`: Express application setup and middleware configuration.
*   `src/server.ts`: Application entry point and server startup.
*   `prisma/`: Prisma schema (`schema.prisma`), migrations, and seed scripts.

## Building and Running

### Prerequisites
*   Node.js 18+
*   npm 9+
*   PostgreSQL 14+

### Setup
1.  Install dependencies:
    ```bash
    npm install
    ```
2.  Environment setup:
    Create a `.env` file based on `.env.example`.
3.  Database initialization:
    ```bash
    npm run prisma:generate
    npm run prisma:migrate
    npm run prisma:seed
    ```

### Development
Start the development server with hot reload:
```bash
npm run dev
```
The API runs by default on `http://localhost:8080/api/v1`.
Interactive Swagger documentation is available at `/api/v1/docs`.

### Production Build
Compile TypeScript to JavaScript and run:
```bash
npm run build
npm run start
```

## Testing
The project uses Jest for testing, with different layers of tests:
*   **All Tests:** `npm test`
*   **Watch Mode:** `npm run test:watch`
*   **Coverage Report:** `npm run test:coverage`
*   **Integration Tests:** `npm run test:integration`
*   **End-to-End (E2E) Tests:** `npm run test:e2e`

## Development Conventions
*   **Code Style:** ESLint and Prettier are configured to enforce code quality and formatting.
    *   Check: `npm run eslint-check-only`
    *   Fix: `npm run eslint-fix`
    *   Format: `npm run prettier`
*   **Validation:** All incoming requests must be validated using Zod schemas before hitting the business logic.
*   **Error Handling:** Use custom error classes and the centralized error handling middleware to ensure consistent API responses.
*   **Authentication:** Endpoints are protected using JWTs (passed via `httpOnly` cookies or `Authorization` headers) and role-based access control.
