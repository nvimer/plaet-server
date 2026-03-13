# Troubleshooting Entry: Shift-Link Architecture Implementation

**ID:** 20260307-CASH-CLOSURE-RELATIONS
**Date:** March 7, 2026
**Issue:** Financial summaries were calculated based on date ranges, which caused discrepancies due to timezone shifts (UTC vs Colombia) and overlapping shifts. Editing historical data could also silently alter past closure balances.

**Root Cause:** The system lacked an explicit relationship between transactions (Orders, Payments, Expenses) and the `CashClosure` model. It relied on the `createdAt` timestamp, which is sensitive to server time configuration.

**Solution:**

1.  **Schema Refactor:** Added `cashClosureId` to `Order`, `Payment`, and `Expense` models.
2.  **Snapshot Logic:** Added financial snapshot fields to `CashClosure` (`totalCash`, `totalNequi`, etc.) to "freeze" the accounting data upon closing.
3.  **Service Enforcement:** Updated `OrderService`, `PaymentService`, and `ExpenseService` to require an open shift and automatically link every transaction to the active `cashClosureId`.
4.  **Optimized Summary:** `CashClosureService.getSummary` now uses indexed ID-based queries instead of date range scans, significantly improving performance and accuracy.

**Result:** 100% accounting integrity. A closed shift's balance will never change, and timezone shifts no longer affect shift boundaries.
