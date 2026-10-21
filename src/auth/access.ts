import type { Me } from '@/api/users';

// Who may open which part of the app. Pure functions, so every case is unit tested.
// The backend checks again (inactive IDs get 403 "Inactive", admin APIs need the ADMIN role).

export type Access = 'blocked' | 'admin' | 'doctor' | 'inactive' | 'active';
export type Area = 'member' | 'admin' | 'doctor';

export function accessOf(me: Pick<Me, 'role' | 'status'>): Access {
  if (me.status === 'blocked' || me.status === 'removed') return 'blocked';
  if (me.role === 'ADMIN') return 'admin';
  if (me.role === 'DOCTOR') return 'doctor';
  return me.status === 'active' ? 'active' : 'inactive';
}

/** Where a logged-in person lands. */
export function homeOf(access: Access): string {
  switch (access) {
    case 'blocked':
      return '/blocked';
    case 'admin':
      return '/admin';
    case 'doctor':
      return '/doctor';
    case 'inactive': // the dashboard, to look around; actions open "Activate your ID" (Vinay 20 Oct)
    case 'active':
      return '/';
  }
}

/** Can this person open this area? An inactive ID may LOOK at the member pages; ActiveLayout locks every action
 * and "My ID Activation" (/activate) is a member page too (Vinay 20 Oct). */
export function canOpen(access: Access, area: Area): boolean {
  switch (area) {
    case 'member':
      return access === 'active' || access === 'inactive';
    case 'admin':
      return access === 'admin';
    case 'doctor':
      return access === 'doctor';
  }
}
