import { Users } from "lucide-react";

const AdminUsers = () => (
  <section className="rounded-2xl border border-slate-800 bg-slate-950/50 p-5">
    <Users className="mb-4 text-emerald-300" size={24} aria-hidden="true" />
    <h2 className="font-semibold text-white">User management</h2>
    <p className="mt-1 text-sm leading-6 text-slate-400">
      User management tools will be available here.
    </p>
  </section>
);

export default AdminUsers;
