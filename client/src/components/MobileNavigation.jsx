import { CalendarDays, Clock3, Compass, Plus, UserRound } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const MobileNavigation = () => {
  const { pathname } = useLocation();
  const isAuthenticated = Boolean(localStorage.getItem("token"));
  const isFeedActive =
    pathname === "/" ||
    pathname === "/feed" ||
    (pathname.startsWith("/reports/") && !pathname.endsWith("/create-report"));
  const isDrivesActive = pathname.startsWith("/drives") && pathname !== "/drives/create";
  const isCreateActive =
    pathname === "/reports/create-report" || pathname === "/drives/create";
  const isActivityActive = pathname === "/activity";
  const isProfileActive = pathname === "/me";

  const items = [
    {
      label: "Feed",
      to: "/feed",
      icon: Compass,
      active: isFeedActive,
    },
    {
      label: "Drives",
      to: "/drives",
      icon: CalendarDays,
      active: isDrivesActive,
    },
    {
      label: "Create",
      to: "/reports/create-report",
      icon: Plus,
      active: isCreateActive,
      prominent: true,
    },
    ...(isAuthenticated
      ? [
          {
            label: "Activity",
            to: "/activity",
            icon: Clock3,
            active: isActivityActive,
          },
          {
            label: "Profile",
            to: "/me",
            icon: UserRound,
            active: isProfileActive,
          },
        ]
      : [
          {
            label: "Sign in",
            to: "/login",
            icon: UserRound,
            active: pathname === "/login",
          },
        ]),
  ];

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-emerald-950/10 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_24px_rgba(27,82,64,0.08)] backdrop-blur md:hidden"
    >
      <div className="mx-auto flex min-h-16 max-w-lg items-stretch justify-around px-2">
        {items.map(({ label, to, icon: Icon, active, prominent }) => (
          <Link
            key={label}
            to={to}
            aria-label={label}
            aria-current={active ? "page" : undefined}
            className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700 ${
              active ? "text-emerald-950" : "text-stone-500 hover:text-emerald-900"
            }`}
          >
            <span
              className={`flex h-7 w-10 items-center justify-center rounded-full ${
                prominent
                  ? "bg-emerald-900 text-white"
                  : active
                    ? "bg-emerald-100 text-emerald-900"
                    : ""
              }`}
            >
              <Icon size={prominent ? 18 : 19} strokeWidth={prominent ? 2.5 : 2} aria-hidden="true" />
            </span>
            <span className="truncate">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
};

export default MobileNavigation;
