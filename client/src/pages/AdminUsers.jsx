import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Search, UserRound, Users } from "lucide-react";
import api from "../services/api";

const PAGE_SIZE = 10;
const inputClassName =
  "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20";

const isValidUsersResponse = (payload) => {
  const pagination = payload?.pagination;

  return (
    payload?.success === true &&
    Array.isArray(payload.data) &&
    payload.data.every(
      (user) =>
        user &&
        typeof user._id === "string" &&
        typeof user.name === "string" &&
        typeof user.username === "string" &&
        typeof user.email === "string" &&
        typeof user.role === "string" &&
        typeof user.isVerified === "boolean" &&
        typeof user.createdAt === "string",
    ) &&
    pagination &&
    Number.isSafeInteger(pagination.page) &&
    pagination.page > 0 &&
    Number.isSafeInteger(pagination.limit) &&
    pagination.limit > 0 &&
    Number.isSafeInteger(pagination.total) &&
    pagination.total >= 0 &&
    Number.isSafeInteger(pagination.totalPages) &&
    pagination.totalPages === Math.ceil(pagination.total / pagination.limit) &&
    typeof pagination.hasMore === "boolean"
  );
};

const formatDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Unknown date"
    : date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
};

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [verificationFilter, setVerificationFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let correctingPage = false;

    const fetchUsers = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await api.get("/admin/users", {
          params: {
            page,
            limit: PAGE_SIZE,
            ...(search ? { search } : {}),
            ...(roleFilter !== "all" ? { role: roleFilter } : {}),
            ...(verificationFilter !== "all" ? { isVerified: verificationFilter } : {}),
          },
          signal: controller.signal,
        });

        if (!isValidUsersResponse(response.data)) {
          throw new Error("The server returned an invalid users response.");
        }

        const responsePagination = response.data.pagination;
        if (responsePagination.page !== page || responsePagination.limit !== PAGE_SIZE) {
          throw new Error("The server returned unexpected user pagination values.");
        }

        const lastPage = Math.max(1, responsePagination.totalPages);
        if (page > lastPage) {
          correctingPage = true;
          setPage(lastPage);
          return;
        }

        setUsers(response.data.data);
        setPagination(responsePagination);
      } catch (requestError) {
        if (requestError.code !== "ERR_CANCELED") {
          setError(
            requestError.response?.data?.message ||
              requestError.message ||
              "Unable to load users. Please retry.",
          );
        }
      } finally {
        if (!controller.signal.aborted && !correctingPage) setLoading(false);
      }
    };

    fetchUsers();
    return () => controller.abort();
  }, [page, retryKey, roleFilter, search, verificationFilter]);

  const totalPages = Math.max(1, pagination.totalPages);
  const applySearch = (event) => {
    event.preventDefault();
    setSearch(searchDraft.trim());
    setPage(1);
  };

  const clearFilters = () => {
    setSearchDraft("");
    setSearch("");
    setRoleFilter("all");
    setVerificationFilter("all");
    setPage(1);
  };

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-5">
        <div className="mb-2 flex items-center gap-2 text-emerald-300">
          <Users size={20} aria-hidden="true" />
          <span className="text-sm font-semibold">Account directory</span>
        </div>
        <h2 className="text-xl font-semibold text-white">User management</h2>
        {!loading && !error && (
          <p className="mt-1 text-sm text-slate-400">
            {pagination.total} {pagination.total === 1 ? "user" : "users"}
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="font-semibold text-white">Find users</h3>
          <button
            type="button"
            onClick={clearFilters}
            className="self-start rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            Clear filters
          </button>
        </div>
        <form onSubmit={applySearch} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300 sm:col-span-2">
            Search by name, username, or email
            <span className="relative">
              <Search
                size={17}
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                type="search"
                className={`${inputClassName} pl-9`}
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                placeholder="Enter a name, username, or email"
                aria-label="Search by name, username, or email"
              />
            </span>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300">
            Role
            <select
              className={inputClassName}
              value={roleFilter}
              onChange={(event) => {
                setRoleFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="all">All roles</option>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300">
            Email verification
            <select
              className={inputClassName}
              value={verificationFilter}
              onChange={(event) => {
                setVerificationFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="all">All accounts</option>
              <option value="true">Verified</option>
              <option value="false">Unverified</option>
            </select>
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              Search
            </button>
          </div>
        </form>
      </div>

      {loading ? (
        <div
          className="rounded-2xl border border-slate-800 bg-slate-950/50 p-10 text-center text-slate-400"
          role="status"
        >
          Loading users...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-900/60 bg-slate-950/50 p-8 text-center">
          <p className="text-red-300" role="alert">
            {error}
          </p>
          <button
            type="button"
            onClick={() => setRetryKey((current) => current + 1)}
            className="mt-4 rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            Retry
          </button>
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-10 text-center">
          <UserRound className="mx-auto mb-3 text-slate-500" size={28} aria-hidden="true" />
          <h3 className="font-semibold text-white">No users found</h3>
          <p className="mt-1 text-sm text-slate-400">There are no accounts to display.</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {users.map((user) => (
              <article
                key={user._id}
                className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4 sm:p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-950 text-emerald-300">
                      <UserRound size={19} aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-white">{user.name}</h3>
                      <p className="break-all text-sm text-slate-400">@{user.username}</p>
                      <a
                        href={`mailto:${user.email}`}
                        className="mt-1 block break-all text-sm text-emerald-300 hover:text-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                      >
                        {user.email}
                      </a>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-5 gap-y-3 text-sm sm:min-w-56">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Role
                      </p>
                      <p
                        className={`mt-1 font-medium ${
                          user.role === "admin" ? "text-emerald-300" : "text-slate-200"
                        }`}
                      >
                        {user.role === "admin" ? "Admin" : "User"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Email
                      </p>
                      <p className={user.isVerified ? "mt-1 text-emerald-300" : "mt-1 text-amber-300"}>
                        {user.isVerified ? "Verified" : "Unverified"}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Joined
                      </p>
                      <p className="mt-1 text-slate-300">{formatDate(user.createdAt)}</p>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-400">
              Page {pagination.page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={16} aria-hidden="true" />
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page >= totalPages}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
};

export default AdminUsers;
