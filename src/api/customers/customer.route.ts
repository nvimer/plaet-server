import { Router } from "express";
import { CustomerController } from "./customer.controller";
import { authJwt } from "../../middlewares/auth.middleware";
import { roleMiddleware } from "../../middlewares/role.middleware";

const router = Router();
const customerController = new CustomerController();

/**
 * @swagger
 * components:
 *   schemas:
 *     Customer:
 *       type: object
 *       required:
 *         - id
 *         - firstName
 *         - lastName
 *         - phone
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Customer unique identifier
 *         firstName:
 *           type: string
 *           minLength: 1
 *           maxLength: 50
 *           description: Customer first name
 *         lastName:
 *           type: string
 *           minLength: 1
 *           maxLength: 50
 *           description: Customer last name
 *         phone:
 *           type: string
 *           minLength: 10
 *           maxLength: 15
 *           description: Customer phone number
 *         email:
 *           type: string
 *           format: email
 *           maxLength: 100
 *           description: Customer email address (optional)
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Customer creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Customer last update timestamp
 *
 *     CustomerCreateInput:
 *       type: object
 *       required:
 *         - firstName
 *         - lastName
 *         - phone
 *       properties:
 *         firstName:
 *           type: string
 *           minLength: 1
 *           maxLength: 50
 *           description: First name
 *           example: "John"
 *         lastName:
 *           type: string
 *           minLength: 1
 *           maxLength: 50
 *           description: Last name
 *           example: "Doe"
 *         phone:
 *           type: string
 *           minLength: 10
 *           maxLength: 15
 *           description: Phone number
 *           example: "+1234567890"
 *         email:
 *           type: string
 *           format: email
 *           maxLength: 100
 *           description: Email address
 *           example: "john.doe@example.com"
 *
 *     CustomerUpdateInput:
 *       type: object
 *       properties:
 *         firstName:
 *           type: string
 *           minLength: 1
 *           maxLength: 50
 *           description: First name
 *         lastName:
 *           type: string
 *           minLength: 1
 *           maxLength: 50
 *           description: Last name
 *         phone:
 *           type: string
 *           minLength: 10
 *           maxLength: 15
 *           description: Phone number
 *         email:
 *           type: string
 *           format: email
 *           maxLength: 100
 *           description: Email address
 *
 *     PaginationResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Customer'
 *         pagination:
 *           type: object
 *           properties:
 *             page:
 *               type: integer
 *               description: Current page number
 *             limit:
 *               type: integer
 *               description: Items per page
 *             total:
 *               type: integer
 *               description: Total number of items
 *             totalPages:
 *               type: integer
 *               description: Total number of pages
 *             hasNext:
 *               type: boolean
 *               description: Whether there's a next page
 *             hasPrev:
 *               type: boolean
 *               description: Whether there's a previous page
 *
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           description: Error description
 *         error:
 *           type: string
 *           description: Error details (optional)
 */

/**
 * @swagger
 * /api/v1/customers:
 *   post:
 *     summary: Create a new customer
 *     description: Create a new customer with the provided information
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CustomerCreateInput'
 *     responses:
 *       201:
 *         description: Customer created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Customer created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Customer'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Phone or email already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

router.post(
  "/",
  authJwt,
  roleMiddleware(["ADMIN", "CASHIER", "WAITER"]),
  customerController.createCustomer,
);

/**
 * @swagger
 * /api/v1/customers:
 *   get:
 *     summary: List customers with pagination
 *     description: Get a paginated list of customers
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [firstName, lastName, createdAt]
 *           default: firstName
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Customers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginationResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

router.get(
  "/",
  authJwt,
  roleMiddleware(["ADMIN", "CASHIER", "WAITER"]),
  customerController.listCustomers,
);

/**
 * @swagger
 * /api/v1/customers/search:
 *   get:
 *     summary: Search customers
 *     description: Search customers by name, last name, or phone number
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         description: Search query for name or phone
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [firstName, lastName, createdAt]
 *           default: firstName
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Customers searched successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginationResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

router.get(
  "/search",
  authJwt,
  roleMiddleware(["ADMIN", "CASHIER", "WAITER"]),
  customerController.searchCustomers,
);

/**
 * @swagger
 * /api/v1/customers/{id}:
 *   get:
 *     summary: Get customer by ID
 *     description: Retrieve a specific customer by their ID
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Customer ID
 *     responses:
 *       200:
 *         description: Customer retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Customer retrieved successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Customer'
 *       404:
 *         description: Customer not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

router.get(
  "/:id",
  authJwt,
  roleMiddleware(["ADMIN", "CASHIER", "WAITER"]),
  customerController.getCustomerById,
);

/**
 * @swagger
 * /api/v1/customers/phone/{phone}:
 *   get:
 *     summary: Get customer by phone number
 *     description: Retrieve a specific customer by their phone number
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: phone
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 10
 *         description: Customer phone number
 *     responses:
 *       200:
 *         description: Customer retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Customer retrieved successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Customer'
 *       404:
 *         description: Customer not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

router.get(
  "/phone/:phone",
  authJwt,
  roleMiddleware(["ADMIN", "CASHIER", "WAITER"]),
  customerController.getCustomerByPhone,
);

/**
 * @swagger
 * /api/v1/customers/{id}:
 *   patch:
 *     summary: Update customer information
 *     description: Update customer information with partial data
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Customer ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CustomerUpdateInput'
 *     responses:
 *       200:
 *         description: Customer updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Customer updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Customer'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Customer not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Phone or email already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

router.patch(
  "/:id",
  authJwt,
  roleMiddleware(["ADMIN", "CASHIER", "WAITER"]),
  customerController.updateCustomer,
);

/**
 * @swagger
 * /api/v1/customers/{id}:
 *   delete:
 *     summary: Delete customer (soft delete)
 *     description: Soft delete a customer (marks as deleted but keeps data)
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Customer ID
 *     responses:
 *       200:
 *         description: Customer deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Customer deleted successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Customer'
 *       404:
 *         description: Customer not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

router.delete(
  "/:id",
  authJwt,
  roleMiddleware(["ADMIN"]),
  customerController.deleteCustomer,
);

export { router as customerRoutes };
