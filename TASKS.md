# Plaet Project Tasks

## Roadmap

### Phase 1: Core Restaurant Management (In Progress)

- [ ] **User Profile Edit Bug Fix**

  - Fix email conflict when editing own profile
  - Status: ✅ COMPLETED (2026-03-13)

- [ ] **Edit Restaurant from SuperAdmin**
  - Allow superadmin to edit restaurant details
  - Status: ⏳ PENDING

### Phase 2: Payments & Billing

- [ ] **Payment Methods for SaaS**
  - Implement payment method management for subscription
  - Status: ⏳ PENDING

### Phase 3: Restaurant Profile

- [ ] **Restaurant Profile Page**
  - Create restaurant profile/edit page
  - Status: ⏳ PENDING

---

## Notes

### 2026-03-13

- Fixed user edit bug: added `excludeUserId` parameter to `findByEmailOrFail` method
- Now when updating a user, the system correctly ignores the current user's email
