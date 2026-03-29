export function isAdminUser(user: any) {
  // Adjust this if you store role elsewhere.
  const role = user?.user_metadata?.role ?? user?.app_metadata?.role
  return role === 'admin'
}