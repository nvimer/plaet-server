# Plaet API - Project Context

This document provides the high-level context and technical overview for the Plaet backend.

## 🚀 Project Overview
Plaet API is an enterprise-level backend designed to power a multi-tenant Restaurant POS system. It handles high-concurrency operations, secure data isolation, and complex business logic for kitchen workflows and stock management.

- **Runtime:** Node.js 18+
- **Framework:** Express.js + TypeScript
- **ORM:** Prisma
- **Database:** PostgreSQL
- **Security:** JWT (Passport.js) + bcrypt
- **Validation:** Zod

## 🏗️ Architecture & Structure
The API follows a **Modular Service-Repository Pattern** designed for testability and scalability.

### Business Modules (`src/api/`)
- `auth`: JWT authentication, token management, and password recovery.
- `menus`: Catalog management, including Items and Categories.
- `items`: Advanced stock management, history tracking, and inventory reports.
- `orders`: Master-Detail order system, billing logic, and kitchen status updates.
- `tables`: Physical layout management and real-time status tracking.
- `users`: User management and Role-Based Access Control (RBAC).
- `analytics`: Multi-tenant business intelligence and sales summaries.

### Shared Infrastructure
- `src/middlewares/`: Global security, logging, and error handling.
- `src/config/`: Environment configuration and external services.
- `src/database/`: Database connection pooling and Prisma setup.

## 🛠️ Core Paradigms
1.  **Automatic Multi-Tenancy:** Strict data isolation enforced at the database driver level.
2.  **Stateless Auth:** JWT-based authentication via secure cookies or headers.
3.  **Predictable Validation:** No request reaches business logic without passing Zod schema validation.
4.  **Audit Logs:** Critical stock movements and billing actions are tracked in dedicated history tables.

## 🍽️ Order Workflow
- **Creation:** Orders are tied to a `Table` or `Customer` (for Take-out).
- **Preparation:** Orders move to the Kitchen Kanban only after payment validation.
- **Stock:** Inventory is automatically deducted based on configured recipes/items upon order confirmation.

---
*For detailed technical guidelines and coding rules, see `AGENTS.md`.*
