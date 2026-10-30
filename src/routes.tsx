import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react';
import { createBrowserRouter, Navigate, useLocation, type RouteObject } from 'react-router';
import { Root, RouteError } from '@/app/Root';
import { AppLoading } from '@/app/AppLoading';
import { GuestOnly, RequireArea } from '@/auth/guards';

// Every screen is its own lazy chunk; admin and doctor code lives in features/admin and features/doctor,
// is built into assets/admin and assets/doctor, and is never precached for members (vite.config.ts).
// Guards, in order: guest -> logged in -> area by role and status (blocked / inactive / active / admin / doctor)
// -> for active members, the locked daily videos (ActiveLayout).

/** Guest pages: loaded by the router as soon as the URL matches. */
const page = (load: () => Promise<{ default: ComponentType }>) => async () => ({
  Component: (await load()).default,
});

/**
 * Pages behind a guard: React.lazy, so the chunk is downloaded only when the guard lets the person in.
 * (A route-level `lazy` is fetched while matching, before the guard runs: a logged-out visitor of /admin
 * would download admin code.)
 */
/** A moved page: same query string, new path. */
function KeepQuery({ to }: { to: string }) {
  return <Navigate to={to + useLocation().search} replace />;
}

function guarded(Page: LazyExoticComponent<ComponentType>) {
  return (
    <Suspense fallback={<AppLoading />}>
      <Page />
    </Suspense>
  );
}

const Activate = lazy(() => import('@/features/activation/Activate'));
const AdminLayout = lazy(() => import('@/features/admin/AdminLayout'));
const AdminDash = lazy(() => import('@/features/admin/AdminDash'));
const AdminFunds = lazy(() => import('@/features/admin/AdminFunds'));
const AdminWithdrawals = lazy(() => import('@/features/admin/AdminWithdrawals'));
const AdminMembers = lazy(() => import('@/features/admin/AdminMembers'));
const AdminMember = lazy(() => import('@/features/admin/AdminMember'));
const AdminSettings = lazy(() => import('@/features/admin/AdminSettings'));
const AdminContent = lazy(() => import('@/features/admin/AdminContent'));
const AdminAdmins = lazy(() => import('@/features/admin/AdminAdmins'));
const AdminAudit = lazy(() => import('@/features/admin/AdminAudit'));
const AdminPins = lazy(() => import('@/features/admin/AdminPins'));
const AdminSuper3 = lazy(() => import('@/features/admin/AdminSuper3'));
const AdminIncome = lazy(() => import('@/features/admin/AdminIncome'));
const AdminShop = lazy(() => import('@/features/admin/AdminShop'));
const AdminDoctors = lazy(() => import('@/features/admin/AdminDoctors'));
const AdminComplaints = lazy(() => import('@/features/admin/AdminComplaints'));
const AdminComplaintDetail = lazy(() => import('@/features/admin/AdminComplaintDetail'));
// Admin screens whose backend exists but whose screen comes in the admin phase: "Coming soon", never empty.
const adminSoon = (title: string) =>
  lazy(async () => {
    const { AdminSoon } = await import('@/features/admin/AdminParts');
    return { default: () => <AdminSoon title={title} /> };
  });
const DoctorHome = lazy(() => import('@/features/doctor/DoctorHome'));
const ActiveLayout = lazy(() => import('@/features/member/ActiveLayout'));
const Home = lazy(() => import('@/features/member/Home'));
const Videos = lazy(() => import('@/features/videos/Videos'));
const Income = lazy(() => import('@/features/member/Income'));
const Team = lazy(() => import('@/features/member/Team'));
const Wallet = lazy(() => import('@/features/member/Wallet'));
const Profile = lazy(() => import('@/features/member/Profile'));
const More = lazy(() => import('@/features/member/More'));
const Rank = lazy(() => import('@/features/member/Rank'));
const Withdraw = lazy(() => import('@/features/money/Withdraw'));
const AddFunds = lazy(() => import('@/features/money/AddFunds'));
const BuyPins = lazy(() => import('@/features/money/BuyPins'));
const P2P = lazy(() => import('@/features/money/P2P'));
const Pins = lazy(() => import('@/features/money/Pins'));
const Super3Tree = lazy(() => import('@/features/super3/Super3Tree'));
const Complaints = lazy(() => import('@/features/complaints/Complaints'));
const ComplaintNew = lazy(() => import('@/features/complaints/ComplaintNew'));
const ComplaintChat = lazy(() => import('@/features/complaints/ComplaintChat'));
const Shop = lazy(() => import('@/features/shop/Shop'));
const Checkout = lazy(() => import('@/features/shop/Checkout'));
const Orders = lazy(() => import('@/features/shop/Orders'));
const AskDoctor = lazy(() => import('@/features/doctor/AskDoctor'));
const NotFound = lazy(() => import('@/features/member/NotFound'));

export const routes: RouteObject[] = [
  {
    element: <Root />,
    errorElement: <RouteError />,
    hydrateFallbackElement: <AppLoading />,
    children: [
      {
        element: <GuestOnly />,
        children: [
          { path: '/login', lazy: page(() => import('@/features/auth/Login')) },
          { path: '/register', lazy: page(() => import('@/features/auth/Register')) },
          { path: '/join/:code', lazy: page(() => import('@/features/auth/Register')) },
          { path: '/forgot', lazy: page(() => import('@/features/auth/Forgot')) },
        ],
      },
      { path: '/blocked', lazy: page(() => import('@/features/auth/Blocked')) },
      // Support set the password: choose your own first (Vinay 28 Oct).
      { path: '/new-password', lazy: page(() => import('@/features/auth/NewPassword')) },
      { path: '/reset-password', lazy: page(() => import('@/features/auth/ResetByLink')) },
      // Public website (Vinay 29 Oct): no login needed; reached from "Back to Site" on the login page.
      { path: '/site', lazy: page(() => import('@/features/site/Landing')) },
      { path: '/about', lazy: page(() => import('@/features/site/About')) },
      { path: '/privacy', lazy: page(() => import('@/features/site/Privacy')) },
      { path: '/contact', lazy: page(() => import('@/features/content/ContactUs')) },

      {
        path: '/admin',
        element: <RequireArea area="admin" />,
        children: [
          {
            element: guarded(AdminLayout),
            children: [
              { index: true, element: guarded(AdminDash) },
              { path: 'funds', element: guarded(AdminFunds) },
              { path: 'withdrawals', element: guarded(AdminWithdrawals) },
              { path: 'members', element: guarded(AdminMembers) },
              { path: 'members/:code', element: guarded(AdminMember) },
              { path: 'settings', element: guarded(AdminSettings) },
              { path: 'content', element: guarded(AdminContent) },
              { path: 'admins', element: guarded(AdminAdmins) },
              { path: 'audit', element: guarded(AdminAudit) },
              { path: 'pins', element: guarded(AdminPins) },
              { path: 'super3', element: guarded(AdminSuper3) },
              { path: 'income', element: guarded(AdminIncome) },
              { path: 'shop', element: guarded(AdminShop) },
              { path: 'doctors', element: guarded(AdminDoctors) },
              { path: 'complaints', element: guarded(AdminComplaints) },
              { path: 'complaints/:id', element: guarded(AdminComplaintDetail) },
              { path: '*', element: guarded(adminSoon('Page not found')) },
            ],
          },
        ],
      },
      {
        path: '/doctor',
        element: <RequireArea area="doctor" />,
        children: [{ path: '*?', element: guarded(DoctorHome) }],
      },

      ...(import.meta.env.DEV ? [{ path: '/dev/ui', lazy: page(() => import('@/features/dev/UiKit')) }] : []),

      {
        element: <RequireArea area="member" />,
        children: [
          {
            element: guarded(ActiveLayout),
            children: [
              { index: true, element: guarded(Home) },
              // "My ID Activation" (inactive IDs; an active one goes Home). Old links land here or on Profile.
              { path: '/activate', element: guarded(Activate) },
              { path: '/activate/pending', element: <Navigate to="/activate" replace /> },
              { path: '/activate/details', element: <Navigate to="/profile" replace /> },
              { path: '/videos', element: guarded(Videos) },
              { path: '/income', element: guarded(Income) },
              // Level income is a tab of My income (Vinay 26 Oct).
              { path: '/level-income', element: <Navigate to="/income?tab=levels" replace /> },
              { path: '/team', element: guarded(Team) },
              { path: '/wallet', element: guarded(Wallet) },
              { path: '/profile', element: guarded(Profile) },
              { path: '/more', element: guarded(More) },
              { path: '/rank', element: guarded(Rank) },
              { path: '/withdraw', element: guarded(Withdraw) },
              { path: '/add-funds', element: guarded(AddFunds) },
              { path: '/p2p', element: guarded(P2P) },
              { path: '/pins', element: guarded(Pins) },
              { path: '/pins/buy', element: guarded(BuyPins) },
              // One Super 3 page for members: the board tree (Vinay 21 Oct). Old links keep their ?journey/board.
              { path: '/super3', element: guarded(Super3Tree) },
              { path: '/super3/tree', element: <KeepQuery to="/super3" /> },
              { path: '/complaints', element: guarded(Complaints) },
              { path: '/complaints/new', element: guarded(ComplaintNew) },
              { path: '/complaints/:id', element: guarded(ComplaintChat) },
              { path: '/shop', element: guarded(Shop) },
              { path: '/shop/checkout', element: guarded(Checkout) },
              { path: '/shop/orders', element: guarded(Orders) },
              { path: '/ask-doctor', element: guarded(AskDoctor) },
              { path: '*', element: guarded(NotFound) },
            ],
          },
        ],
      },
    ],
  },
];

export const router = createBrowserRouter(routes);
