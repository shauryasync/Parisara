import { ArrowUpRight, Heart, Leaf } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => (
  <footer className="relative mt-12 border-t border-emerald-950/10 bg-[#e9eee8]">
    <img
      src="/protect_planet.png"
      alt="Protect our planet"
      className="absolute -top-12 right-5 z-10 h-24 w-24 -rotate-6 object-contain drop-shadow-[0_10px_18px_rgba(18,68,45,0.18)] sm:right-10 sm:h-32 sm:w-32 lg:-top-16 lg:right-[8%] lg:h-40 lg:w-40"
    />

    <div className="mx-auto grid max-w-7xl gap-10 px-5 pb-10 pt-14 sm:px-8 sm:pt-16 lg:grid-cols-[1.4fr_1fr_1fr] lg:gap-16 lg:pb-14 lg:pt-16">
      <div className="max-w-sm">
        <Link
          to="/feed"
          aria-label="Parisara home"
          className="mb-4 inline-flex items-center gap-3 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-800"
        >
          <img src="/parisara-mark.png" alt="" className="h-12 w-12 object-contain" />
          <span className="text-xl font-semibold tracking-tight text-emerald-950">Parisara</span>
        </Link>
        <p className="text-sm leading-6 text-stone-600">
          A cleaner, greener neighborhood starts with people who care enough to show up.
        </p>
        <p className="mt-5 inline-flex items-center gap-2 text-xs font-medium text-emerald-900">
          Made for the places we call home <Heart size={13} aria-hidden="true" />
        </p>
      </div>

      <nav aria-label="Explore Parisara">
        <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-950">Explore</h2>
        <ul className="mt-4 space-y-3 text-sm text-stone-600">
          <li>
            <Link className="transition hover:text-emerald-900" to="/feed">
              Community feed
            </Link>
          </li>
          <li>
            <Link className="transition hover:text-emerald-900" to="/drives">
              Community drives
            </Link>
          </li>
          <li>
            <Link className="transition hover:text-emerald-900" to="/activity">
              My activity
            </Link>
          </li>
        </ul>
      </nav>

      <div className="max-w-xs">
        <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-950">
          Take action
        </h2>
        <p className="mt-4 text-sm leading-6 text-stone-600">
          Turn a local concern into a shared effort. Every small action helps a community thrive.
        </p>
        <Link
          to="/reports/create-report"
          className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-emerald-900 transition hover:text-emerald-700"
        >
          Share a report <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-stone-500">
          <Leaf size={13} aria-hidden="true" />
          Rooted in community, growing together.
        </p>
      </div>
    </div>

    <div className="border-t border-emerald-950/10">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 pb-24 pt-5 text-xs text-stone-500 sm:flex-row sm:items-center sm:justify-between sm:px-8 md:pb-5">
        <p>© {new Date().getFullYear()} Parisara. Growing greener communities together.</p>
        <Link className="transition hover:text-emerald-900" to="/drives">
          Find your next community drive
        </Link>
      </div>
    </div>
  </footer>
);

export default Footer;
