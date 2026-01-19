import { Request, Response, NextFunction } from "express";
import { CustomerService } from "./customer.service";
import {
  createCustomerSchema,
  updateCustomerSchema,
  searchCustomersSchema,
  customerIdSchema,
  phoneSearchSchema,
} from "./customer.validator";
import { CustomError } from "../../types/custom-errors";

/**
 * Customer controller (thin architecture)
 * Handles HTTP requests and delegates to service layer
 */
export class CustomerController {
  private customerService: CustomerService;

  constructor() {
    this.customerService = new CustomerService();
  }

  /**
   * Create a new customer
   * POST /api/v1/customers
   */
  createCustomer = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const validatedData = createCustomerSchema.parse(req.body);
      const customer = await this.customerService.createCustomer(validatedData);

      res.status(201).json({
        success: true,
        message: "Customer created successfully",
        data: customer,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get customer by ID
   * GET /api/v1/customers/:id
   */
  getCustomerById = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { id } = customerIdSchema.parse(req.params);
      const customer = await this.customerService.getCustomerById(id);

      res.status(200).json({
        success: true,
        message: "Customer retrieved successfully",
        data: customer,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get customer by phone number
   * GET /api/v1/customers/phone/:phone
   */
  getCustomerByPhone = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { phone } = phoneSearchSchema.parse(req.params);
      const customer = await this.customerService.getCustomerByPhone(phone);

      res.status(200).json({
        success: true,
        message: "Customer retrieved successfully",
        data: customer,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Search customers
   * GET /api/v1/customers/search
   */
  searchCustomers = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const searchParams = searchCustomersSchema.parse(req.query);
      const result = await this.customerService.searchCustomers(searchParams);

      res.status(200).json({
        success: true,
        message: "Customers searched successfully",
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * List customers with pagination
   * GET /api/v1/customers
   */
  listCustomers = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const listParams = searchCustomersSchema.parse(req.query);
      const result = await this.customerService.listCustomers(listParams);

      res.status(200).json({
        success: true,
        message: "Customers listed successfully",
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update customer information
   * PATCH /api/v1/customers/:id
   */
  updateCustomer = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { id } = customerIdSchema.parse(req.params);
      const updateData = updateCustomerSchema.parse(req.body);

      const customer = await this.customerService.updateCustomer(
        id,
        updateData,
      );

      res.status(200).json({
        success: true,
        message: "Customer updated successfully",
        data: customer,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete customer (soft delete)
   * DELETE /api/v1/customers/:id
   */
  deleteCustomer = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { id } = customerIdSchema.parse(req.params);
      const customer = await this.customerService.deleteCustomer(id);

      res.status(200).json({
        success: true,
        message: "Customer deleted successfully",
        data: customer,
      });
    } catch (error) {
      next(error);
    }
  };
}
