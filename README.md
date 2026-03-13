# 🍽 Plaet API - Restaurant Management System

A robust, enterprise-level backend API for managing restaurant operations, built with Node.js, Express, TypeScript and Prisma.

## 🎯 Current Status

**✅ Production-Ready** - Fully configured for Railway deployment
**🏗️ Architecture** - Enterprise-level patterns and best practices
**🚀 Deploy Ready** - Complete CI/CD pipeline configured
**🔐 Security** - Enterprise-grade authentication system

---

## 🚀 Features

### 🏗️ Core Architecture

- **RESTful API** following OpenAPI 3.0 specification
- **JWT-based authentication** with role-based access control
- **TypeScript** for type safety and developer experience
- **Prisma ORM** for type-safe database operations
- **Express.js** with modern middleware stack
- **Environment validation** with Zod schemas
- **Winston logging** with structured error handling

### 🔐 Enterprise Authentication System

Complete authentication module with enterprise-grade security:

- **✅ User Registration** - With automatic email verification
- **✅ User Login** - JWT tokens in httpOnly cookies
- **✅ User Logout** - Complete token blacklisting
- **✅ Password Reset** - Secure flow with email (1 hour expiry)
- **✅ Change Password** - With current password verification
- **✅ Email Verification** - Automatic on registration
- **✅ Token Refresh** - With token rotation
- **✅ Account Lockout** - After 5 failed attempts (15 min)
- **✅ Rate Limiting** - On all public endpoints
- **✅ Strong Password Policy** - 12+ chars, complexity rules

**Security Features:**

- **httpOnly Cookies** - Tokens not accessible via JavaScript
- **Token Blacklisting** - Complete session revocation
- **Token Rotation** - Refresh tokens rotated on use
- **Brute Force Protection** - Account lockout after failed attempts
- **Email Enumeration Prevention** - Generic success messages
- **Audit Logging** - All auth operations logged

### 🛡️ Security Features

- **JWT authentication** with configurable expiration
- **Role-based access control** (ADMIN, CASHIER, WAITER)
- **CORS protection** with configurable origins
- **Helmet security headers** for production
- **Password hashing** with bcrypt (configurable rounds)
- **Input validation** with Zod schemas
- **Rate limiting** on all auth endpoints

### 🗄️ Database Features

- **PostgreSQL** with Prisma ORM
- **Type-safe migrations** with automatic deployment
- **Soft deletes** for data integrity
- **Relationship management** with proper foreign keys
- **Indexing strategy** for performance optimization

### 📊 Business Modules

- **Customer Management** - Full CRUD with search and pagination
- **User Management** - Role-based user system
- **Menu Management** - Categories, items, inventory tracking
- **Order Management** - Complete order lifecycle
- **Table Management** - Restaurant table allocation
- **Permission System** - Granular access control
- **Profile System** - User profile management

---

## 📋 Prerequisites

### Required Software

- **Node.js 18+**
- **npm 9+**
- **PostgreSQL 14+** (local development)
- **Git** for version control

### Development Tools

- **VS Code** (recommended) with extensions:
  - Prisma
  - TypeScript
  - ESLint
  - Prettier

---

## 🚀 Quick Start

### 1. Repository Setup

```bash
git clone https://github.com/niccommit/plaet-api.git
cd plaet-api/server
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit with your configuration
nano .env
```

### 4. Database Setup

```bash
# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# (Optional) Seed initial data
npm run prisma:seed
```

### 5. Start Development Server

```bash
npm run dev
```

Your API will be available at: `http://localhost:8080/api/v1`

---

## 🛠️ Available Scripts

### Development

```bash
npm run dev          # Start development server with hot reload
npm run build        # Build TypeScript to JavaScript
npm run start        # Start production server
```

### Database

```bash
npm run prisma:generate    # Generate Prisma client
npm run prisma:migrate     # Run database migrations
npm run prisma:seed        # Seed database with initial data
npm run prisma:reset       # Reset database (development only)
```

### Code Quality

```bash
npm run eslint-check-only    # Run ESLint without fixing
npm run eslint-fix           # Run ESLint and auto-fix issues
npm run prettier            # Format code with Prettier
```

### Testing

```bash
npm test                  # Run all tests
npm run test:watch         # Run tests in watch mode
npm run test:coverage       # Run tests with coverage report
npm run test:integration     # Run integration tests only
npm run test:e2e           # Run end-to-end tests
```

---

## 📁 Project Structure

```
src/
├── api/                     # API routes and business logic
│   ├── auth/               # Authentication module (complete)
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.route.ts
│   │   ├── auth.validator.ts
│   │   └── tokens/         # Token management
│   ├── customers/          # Customer management
│   ├── menus/              # Menu and inventory
│   ├── orders/             # Order processing
│   ├── roles/              # Role management
│   ├── tables/             # Table management
│   └── users/              # User management
├── config/                  # Configuration management
│   ├── email.ts            # Email service
│   ├── logger.ts           # Winston logger
│   └── swagger.ts          # API documentation
├── database/                # Database connection and utilities
├── interfaces/              # TypeScript interface definitions
├── middlewares/             # Express middleware
│   ├── auth.middleware.ts  # JWT authentication
│   ├── rateLimit.middleware.ts  # Rate limiting
│   └── tokenBlacklist.middleware.ts  # Token blacklisting
├── strategies/              # Passport authentication strategies
├── types/                   # Custom TypeScript types
├── utils/                   # Utility functions
├── app.ts                   # Express application setup
└── server.ts                # Server entry point
```

---

## 🔐 Security Configuration

### Environment Variables (Required)

```bash
# Server Configuration
NODE_ENV=production
PORT=8080
APP_URL=https://your-domain.railway.app/api/v1
CLIENT_URL=https://your-frontend.com

# Database
DATABASE_URL=postgresql://username:password@host:port/database

# JWT Authentication
JWT_SECRET=your-secure-jwt-secret-32-chars-min
JWT_ACCESS_EXPIRATION_MINUTES=30
JWT_ACCESS_EXPIRATION_DAYS=7

# Password Hashing
SALT_ROUNDS=10

# Email Configuration (Resend)
RESEND_API_KEY=re_your_api_key_here
FROM_EMAIL=no-reply@plaet.cloud

# CORS
ALLOWED_ORIGINS=https://your-domain.railway.app,https://your-frontend.app
```

### Generate Secure JWT Secret

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## 🚀 Production Deployment

### Option 1: Railway (Recommended)

📖 **Complete Guide**: See `README_DEPLOYMENT.md`

#### Quick Deploy:

```bash
# 1. Login to Railway CLI
npx @railway/cli login

# 2. Deploy
./scripts/deploy-npx.sh
```

### Option 2: Railway Dashboard

1. **Visit**: https://railway.app/new
2. **Connect**: Your GitHub repository
3. **Configure**: Environment variables (see section above)
4. **Deploy**: Automatic on push to main branch

### Environment Variables for Railway

Railway provides these automatically:

- `RAILWAY_PUBLIC_DOMAIN`: Your app's URL
- `postgresql.DATABASE_URL`: PostgreSQL connection string
- `RAILWAY_SERVICE_NAME`: Service name

---

## 📝 API Documentation

### Base URL

```
Development: http://localhost:8080/api/v1
Production: https://your-domain.railway.app/api/v1
```

### Interactive Documentation

- **Swagger UI**: `/api/v1/docs`
- **OpenAPI Spec**: `/api/v1/docs-json`

### Authentication

All protected endpoints require JWT token in either:

- **httpOnly Cookie** (automatically sent by browser)
- **Authorization Header**: `Bearer <your-jwt-token>`

### Health Endpoints

- **Health Check**: `/api/health`
- **API Status**: `/api/v1/health`

---

## 🔐 Authentication Endpoints

### Public Endpoints (No Authentication Required)

```bash
# Authentication
POST   /api/v1/auth/register              # User registration + verification email
POST   /api/v1/auth/login                 # User login (sets httpOnly cookies)
POST   /api/v1/auth/forgot-password       # Request password reset
POST   /api/v1/auth/reset-password        # Reset password with token
POST   /api/v1/auth/verify-email          # Verify email with token
POST   /api/v1/auth/resend-verification   # Resend verification email
POST   /api/v1/auth/refresh-token         # Refresh access/refresh tokens
```

### Protected Endpoints (Authentication Required)

```bash
POST   /api/v1/auth/logout                # User logout (blacklists tokens)
POST   /api/v1/auth/change-password       # Change password (invalidates all sessions)
```

### Example Usage

```bash
# Register
 curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "password": "SecurePass123!"
  }'

# Login (saves cookies)
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"SecurePass123!"}' \
  -c cookies.txt

# Access protected endpoint
curl http://localhost:8080/api/v1/profile/me \
  -b cookies.txt

# Logout
curl -X POST http://localhost:8080/api/v1/auth/logout \
  -b cookies.txt
```

---

## 📊 Business Endpoints

### Customer Management

```bash
GET    /api/v1/customers                  # List with pagination
POST   /api/v1/customers                  # Create customer
GET    /api/v1/customers/:id              # Get by ID
PATCH  /api/v1/customers/:id              # Update customer
DELETE /api/v1/customers/:id              # Delete customer (soft)
GET    /api/v1/customers/search           # Search customers
GET    /api/v1/customers/phone/:phone     # Get by phone
```

### Menu Management

```bash
# Categories
GET    /api/v1/menu/categories
POST   /api/v1/menu/categories
GET    /api/v1/menu/categories/:id
PATCH  /api/v1/menu/categories/:id
DELETE /api/v1/menu/categories/:id

# Menu Items
GET    /api/v1/menu/items
POST   /api/v1/menu/items
GET    /api/v1/menu/items/:id
PATCH  /api/v1/menu/items/:id
DELETE /api/v1/menu/items/:id

# Stock Management
POST   /api/v1/menu/items/stock/reset     # Daily stock reset
POST   /api/v1/menu/items/:id/stock/add    # Add stock
POST   /api/v1/menu/items/:id/stock/remove # Remove stock
GET    /api/v1/menu/items/stock/low        # Low stock items
GET    /api/v1/menu/items/stock/out        # Out of stock items
GET    /api/v1/menu/items/:id/stock/history # Stock history
```

### Order Management

```bash
GET    /api/v1/orders                      # List orders
POST   /api/v1/orders                      # Create order
GET    /api/v1/orders/:id                  # Get order by ID
PATCH  /api/v1/orders/:id                  # Update order status
DELETE /api/v1/orders/:id                  # Cancel order
```

---

## 🧪 Testing Strategy

### Test Structure

```
src/api/**/
├── __tests__/
│   ├── unit/           # Unit tests for individual components
│   ├── integration/     # Full feature integration tests
│   └── helpers/        # Test utilities and fixtures
└── *.test.ts           # Component-specific tests
```

### Running Tests

```bash
# Development testing
npm test

# Continuous Integration
npm run test:ci

# Coverage Report
npm run test:coverage
```

### Test Coverage

- **61.25% statements** (production-ready)
- **37.52% branches** (comprehensive feature coverage)
- **63.18% lines** (functional reliability)
- **49.03% functions** (core functionality covered)

---

## 🎛️ Architecture Patterns

### Dependency Injection

- Service layer with repository pattern
- Interface-based design for testability
- Proper separation of concerns

### Error Handling

- Custom error classes with HTTP status codes
- Consistent error response format
- Structured logging for debugging

### Validation

- Input validation with Zod schemas
- Type-safe data transformation
- Comprehensive error messages

### Performance

- Database indexing strategy
- Optimized query patterns
- Lazy loading where appropriate
- Response caching implementation

---

## 🔄 CI/CD Pipeline

### GitHub Actions

- **Automatic testing** on every push
- **Railway deployment** on main branch
- **Health checks** after deployment
- **Rollback on failure**

### Environment Promotion

```
develop → main (staging) → production
```

---

## 🛠️ Development Workflow

### Branch Strategy

```bash
main        # Production-ready code
develop     # Feature development
feature/*   # Individual features
hotfix/*    # Critical bug fixes
```

### Commit Convention

```bash
feat: add new feature
fix: resolve bug
docs: documentation updates
refactor: code improvements
test: test additions
chore: maintenance tasks
```

---

## 🔍 Monitoring & Logging

### Winston Logging

```javascript
// Structured logging with levels
logger.info("User logged in", { userId, role });
logger.warn("Low stock alert", { itemId, currentStock });
logger.error("Database error", { error: err.message });
```

### Health Monitoring

- **Application health**: `/api/health`
- **Database connectivity**: Automated checks
- **Resource monitoring**: Memory and CPU usage
- **Error tracking**: Comprehensive error logs

---

## 🤝 Contributing

### Development Process

1. **Fork** the repository
2. **Create** feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** changes: `git commit -m 'feat: Add amazing feature'`
4. **Push** branch: `git push origin feature/amazing-feature`
5. **Open** Pull Request with detailed description

### Code Standards

- **TypeScript** for type safety
- **ESLint** for code quality
- **Prettier** for consistent formatting
- **Tests** for new features
- **Documentation** for API changes

---

## 📄 License

This project is licensed under the **ISC License**.

---

## 👥 Authors & Credits

**Developed by**: **NgCraftz**

- Architecture & Backend Development
- API Design & Documentation
- Database Schema Design
- Deployment Configuration
- Security Implementation

---

## 📞 Support & Contact

### Documentation

- **API Docs**: Available at `/api/v1/docs`
- **Authentication Guide**: See `AGENTS.md` (Authentication Module section)
- **Deployment Guide**: See `README_DEPLOYMENT.md`
- **Issues**: GitHub Issues for bug reports

### Quick Links

- **Repository**: https://github.com/niccommit/plaet-api
- **API Documentation**: http://localhost:8080/api/v1/docs
- **Health Check**: http://localhost:8080/api/health

---

## 🎯 Recent Updates

### v2.3.0 - Complete Authentication Module

- ✅ Enterprise-grade authentication system
- ✅ Password reset with email
- ✅ Email verification flow
- ✅ Token rotation and blacklisting
- ✅ Account lockout protection
- ✅ Swagger documentation for all endpoints
- ✅ Code cleanup and optimization

### v2.2.0 - Railway Deployment Ready

- ✅ Production-ready configuration
- ✅ Complete CI/CD pipeline
- ✅ Enterprise-level architecture

**Ready for Restaurant Management! 🍽**
