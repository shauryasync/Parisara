import { LayoutDashboard } from "lucide-react";

const AdminOverview = () => (
  <section className="rounded-2xl border border-slate-800 bg-slate-950/50 p-5">
    <LayoutDashboard className="mb-4 text-emerald-300" size={24} aria-hidden="true" />
    <h2 className="font-semibold text-white">Overview</h2>
    <p className="mt-1 text-sm leading-6 text-slate-400">
      Dashboard landing page
    </p>
  </section>
);

export default AdminOverview;
