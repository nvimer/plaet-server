# Historical Data entry blocked by Cash Closure validation

*   **ID:** 1741651500
*   **Date:** 2026-03-10
*   **Description:** The historical data entry module (creating past orders for analysis) stopped working after the implementation of the Cash Closure feature. Orders failed with "CASH_CLOSURE_REQUIRED" even when backdated.
*   **Root Cause:** Strict backend validation in `OrderService` and `PaymentService` that required an `OPEN` cash closure for *any* order/payment creation, without considering the transaction date.
*   **Solution:** Modified `OrderCreationService` and `PaymentService` to be date-aware. If the `createdAt` date is in the past (historical), the system now attempts to find a closure on that specific date but allows the creation (even with `null` closureId) if none is found. Real-time orders (today) still strictly require an open closure.
