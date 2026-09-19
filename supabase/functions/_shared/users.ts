/** Columns safe to return for a user: never the password or the lockout counters. */
export const USER_COLUMNS = `
  id, first_name, last_name, email, phone, email_verified, must_change_password,
  restaurant_id, created_at, updated_at,
  profile:profiles(id, photo_url, "birthDate", identification, address),
  user_roles(role:roles(id, name, description, restaurant_id))
`;

// deno-lint-ignore no-explicit-any
export function withRoles(user: any) {
  if (!user) return user;
  const roles = (user.user_roles || [])
    // deno-lint-ignore no-explicit-any
    .map((ur: any) => ur.role)
    .filter(Boolean);
  const { user_roles: _ignored, ...rest } = user;
  return { ...rest, roles, role: roles[0]?.name ?? null };
}
