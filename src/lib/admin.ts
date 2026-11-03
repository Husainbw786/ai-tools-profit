/**
 * The single platform admin. Only this account sees the Admin entry in
 * Settings, and — more importantly — the admin server functions in
 * src/lib/admin.functions.ts refuse every other caller.
 */
export const ADMIN_EMAIL = "husainhackerrank@gmail.com";

export function isAdminEmail(email: string | null | undefined): boolean {
  return (email ?? "").trim().toLowerCase() === ADMIN_EMAIL;
}
