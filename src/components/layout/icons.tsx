import type { ReactNode } from 'react';

// Line icons for the app menus (one style: 24 grid, 1.8 stroke, currentColor). Decorative: the label says it.
const svg = (children: ReactNode) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className="flex-none"
  >
    {children}
  </svg>
);

export const Icon = {
  home: svg(<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />),
  dash: svg(
    <>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </>,
  ),
  income: svg(<path d="M4 19V9M10 19V5M16 19v-7M22 19H2" />),
  levels: svg(<path d="M4 20h4v-5H4zM10 20h4V10h-4zM16 20h4V4h-4z" />),
  team: svg(
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6" />
    </>,
  ),
  super3: svg(
    <>
      <circle cx="12" cy="5" r="2.5" />
      <circle cx="5" cy="19" r="2.5" />
      <circle cx="12" cy="19" r="2.5" />
      <circle cx="19" cy="19" r="2.5" />
      <path d="M12 7.5v9M10.8 7.2l-4.6 9.6M13.2 7.2l4.6 9.6" />
    </>,
  ),
  rank: svg(<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />),
  wallet: svg(
    <>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18M16 14h2" />
    </>,
  ),
  videos: svg(
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M10 9l5 3-5 3z" />
    </>,
  ),
  shop: svg(
    <>
      <path d="M5 8h14l-1 12H6z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </>,
  ),
  doctor: svg(<path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10z" />),
  complaints: svg(<path d="M4 5h16v11H9l-5 4z" />),
  profile: svg(
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>,
  ),
  funds: svg(<path d="M12 3v18M7 8h7a3 3 0 0 1 0 6H8" />),
  withdraw: svg(<path d="M12 4v12M7 11l5 5 5-5M4 20h16" />),
  pins: svg(
    <>
      <rect x="3" y="7" width="18" height="11" rx="2" />
      <path d="M7 12h.01M11 12h.01M15 12h.01" />
    </>,
  ),
  content: svg(
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M10 9l5 3-5 3z" />
    </>,
  ),
  settings: svg(
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" />
    </>,
  ),
  admins: svg(
    <>
      <path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6z" />
      <path d="M9 12l2 2 4-4" />
    </>,
  ),
  audit: svg(<path d="M8 4h11v16H5V7zM8 4v3H5M9 11h6M9 15h6" />),
  logout: svg(<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" />),
  menu: svg(<path d="M4 6h16M4 12h16M4 18h16" />),
  collapse: svg(<path d="M15 6l-6 6 6 6" />),
  expand: svg(<path d="M9 6l6 6-6 6" />),
  search: svg(
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </>,
  ),
  chevronDown: svg(<path d="M6 9l6 6 6-6" />),
  inbox: svg(
    <>
      <path d="M3 13l3-8h12l3 8v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
      <path d="M3 13h5l1 3h6l1-3h5" />
    </>,
  ),
};
