export type Role = 'user' | 'admin';

/** A seeded user (A8). There is no real auth: identity is the X-User-Id header. */
export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

/** GET /api/users: what the mock "Acting as" switcher needs (DS6). */
export type UserSummary = Pick<User, 'id' | 'name' | 'role'>;
