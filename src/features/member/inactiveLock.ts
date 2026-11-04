// An INACTIVE member may look at every member page (Vinay 20 Oct), but nothing that needs an active ID:
// these pages show "Activate your ID first" instead (the server also refuses them with 403 "Inactive").
// Help (complaints), Profile and the activation pages stay usable: they are how the ID gets active.
// Daily videos are open to an inactive ID (Vinay 3 Nov).
export const LOCKED_FOR_INACTIVE = [
  '/withdraw',
  '/add-funds',
  '/p2p',
  '/pins',
  '/pins/buy',
  '/shop/checkout',
  '/ask-doctor',
];

export function isLockedForInactive(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, '') || '/';
  return LOCKED_FOR_INACTIVE.includes(path);
}
