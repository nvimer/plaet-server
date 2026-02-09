import { Table, TableStatus } from "@prisma/client";
import { TableService } from "../../table.service";
import { TableRepositoryInterface } from "../../interfaces/table.repository.interface";
import { createMockTableRepository } from "../helpers";
import { createTableFixture } from "../helpers/table.fixtures";
import {
  PaginationParams,
  PaginatedResponse,
} from "../../../../interfaces/pagination.interfaces";
import { CreateTableInput, UpdateTableInput } from "../../table.validator";

describe("TableService - Unit Tests", () => {
  let tableService: TableService;
  let mockTableRepository: jest.Mocked<TableRepositoryInterface>;

  const createPaginatedResponse = <T>(
    data: T[],
    overrides: Partial<PaginatedResponse<T>["meta"]> = {},
  ): PaginatedResponse<T> => ({
    data,
    meta: {
      total: data.length,
      page: 1,
      limit: 10,
      totalPages: Math.ceil(data.length / 10) || 1,
      hasNextPage: false,
      hasPreviousPage: false,
      ...overrides,
    },
  });

  beforeEach(() => {
    mockTableRepository = createMockTableRepository();
    tableService = new TableService(mockTableRepository);
    jest.clearAllMocks();
  });

  describe("findAllTables", () => {
    it("should return paginated tables when valid params provided", async () => {
      // Arrange
      const params: PaginationParams = { page: 1, limit: 10 };
      const tables = [
        createTableFixture({ id: 1, number: "T1" }),
        createTableFixture({ id: 2, number: "T2" }),
      ];
      const expectedResponse = createPaginatedResponse(tables);

      mockTableRepository.findAll.mockResolvedValue(expectedResponse);

      // Act
      const result = await tableService.findAllTables(params);

      // Assert
      expect(mockTableRepository.findAll).toHaveBeenCalledWith(params);
      expect(result).toEqual(expectedResponse);
      expect(result.data).toHaveLength(2);
    });

    it("should return empty list when no tables exist", async () => {
      // Arrange
      const params: PaginationParams = { page: 1, limit: 10 };
      const emptyResponse = createPaginatedResponse<Table>([]);

      mockTableRepository.findAll.mockResolvedValue(emptyResponse);

      // Act
      const result = await tableService.findAllTables(params);

      // Assert
      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });
  });

  describe("findTableById", () => {
    it("should return table when found", async () => {
      // Arrange
      const id = 1;
      const table = createTableFixture({ id });

      mockTableRepository.findById.mockResolvedValue(table);

      // Act
      const result = await tableService.findTableById(id);

      // Assert
      expect(mockTableRepository.findById).toHaveBeenCalledWith(id);
      expect(result).toEqual(table);
    });

    it("should return table when table exists", async () => {
      // Arrange
      const id = 1;
      const table = createTableFixture({ id });

      mockTableRepository.findById.mockResolvedValue(table);

      // Act
      const result = await tableService.findTableById(id);

      // Assert
      expect(result).toEqual(table);
    });
  });

  describe("createTable", () => {
    it("should create table when valid data provided", async () => {
      // Arrange
      const input: CreateTableInput = {
        number: "T10",
        status: TableStatus.AVAILABLE,
        location: "Interior",
      };
      const created = createTableFixture(input);

      mockTableRepository.create.mockResolvedValue(created);

      // Act
      const result = await tableService.createTable(input);

      // Assert
      expect(mockTableRepository.create).toHaveBeenCalledWith(input);
      expect(result).toEqual(created);
    });
  });

  describe("updateTable", () => {
    it("should update table when valid data provided", async () => {
      // Arrange
      const id = 1;
      const input: UpdateTableInput = {
        status: TableStatus.OCCUPIED,
        location: "Terraza",
      };
      const existing = createTableFixture({ id });
      const updated = createTableFixture({ id, ...input });

      mockTableRepository.update.mockResolvedValue(updated);

      // Act
      const result = await tableService.updateTable(id, input);

      // Assert
      expect(mockTableRepository.update).toHaveBeenCalledWith(id, input);
      expect(result).toEqual(updated);
    });
  });

  describe("deleteTable", () => {
    it("should delete table when table exists", async () => {
      // Arrange
      const id = 1;

      mockTableRepository.delete.mockResolvedValue(undefined);

      // Act
      await tableService.deleteTable(id);

      // Assert
      expect(mockTableRepository.delete).toHaveBeenCalledWith(id);
      expect(mockTableRepository.delete).toHaveBeenCalledTimes(1);
    });
  });

  describe("updateTableStatus", () => {
    it("should update table status when valid status provided", async () => {
      // Arrange
      const id = 1;
      const status = TableStatus.OCCUPIED;
      const updated = createTableFixture({ id, status });

      mockTableRepository.updateStatus.mockResolvedValue(updated);

      // Act
      const result = await tableService.updateTableStatus(id, status);

      // Assert
      expect(mockTableRepository.updateStatus).toHaveBeenCalledWith(id, status);
      expect(result).toEqual(updated);
      expect(result.status).toBe(status);
    });

    it("should update status to AVAILABLE", async () => {
      // Arrange
      const id = 1;
      const status = TableStatus.AVAILABLE;
      const updated = createTableFixture({ id, status });

      mockTableRepository.updateStatus.mockResolvedValue(updated);

      // Act
      const result = await tableService.updateTableStatus(id, status);

      // Assert
      expect(result.status).toBe(TableStatus.AVAILABLE);
    });

    it("should update status to NEEDS_CLEANING", async () => {
      // Arrange
      const id = 1;
      const status = TableStatus.NEEDS_CLEANING;
      const updated = createTableFixture({ id, status });

      mockTableRepository.updateStatus.mockResolvedValue(updated);

      // Act
      const result = await tableService.updateTableStatus(id, status);

      // Assert
      expect(result.status).toBe(TableStatus.NEEDS_CLEANING);
    });
  });
});
