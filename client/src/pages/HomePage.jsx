import {
  ArrowRight,
  BriefcaseBusiness,
  Search,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GigCard } from "../components/gigs/GigCard.jsx";
import { SiteFooter } from "../components/navigation/SiteFooter.jsx";
import { SiteHeader } from "../components/navigation/SiteHeader.jsx";
import { Spinner } from "../components/Spinner.jsx";
import { useAuth } from "../context/auth-context.js";
import { useToast } from "../context/toast-context.js";
import { showLoginRequired } from "../lib/confirm-action.js";
import { apiError, gigApi } from "../services/api.js";

export function HomePage() {
  const { isAuthenticated } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [gigs, setGigs] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const load = useCallback(async (cursor, append = false) => {
    append ? setLoadingMore(true) : setLoading(true);
    try {
      const response = await gigApi.list({
        limit: 6,
        ...(cursor ? { cursor } : {}),
      });
      setGigs((current) =>
        append
          ? [...current, ...response.data.data.gigs]
          : response.data.data.gigs,
      );
      setPagination(response.data.meta.pagination);
      setError("");
    } catch (reason) {
      setError(apiError(reason).message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const bookmark = async (gig) => {
    if (!isAuthenticated) {
      await showLoginRequired();
      navigate("/login", { state: { from: { pathname: "/" } } });
      return;
    }
    setBusy(gig.id);
    try {
      gig.isBookmarked
        ? await gigApi.removeBookmark(gig.id)
        : await gigApi.bookmark(gig.id);
      setGigs((current) =>
        current.map((item) =>
          item.id === gig.id
            ? { ...item, isBookmarked: !item.isBookmarked }
            : item,
        ),
      );
      notify(
        gig.isBookmarked ? "Removed from favourites." : "Saved to favourites.",
      );
    } catch (reason) {
      notify(apiError(reason).message, "error");
    } finally {
      setBusy("");
    }
  };
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main>
        <section className="relative overflow-hidden bg-[radial-gradient(circle_at_20%_0%,#dbe8ff_0,transparent_28%),radial-gradient(circle_at_85%_20%,#e0e7ff_0,transparent_32%),linear-gradient(180deg,#f8faff_0,#fff_100%)] px-5 py-20 text-center sm:py-28">
          <div className="mx-auto max-w-5xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-4 py-2 text-xs font-bold text-brand-600">
              <Sparkles size={15} />
              The student collaboration platform
            </span>
            <h1 className="mt-7 text-5xl font-black tracking-[-.045em] text-slate-950 sm:text-6xl lg:text-7xl">
              Turn your skills into{" "}
              <span className="text-brand-600">opportunities</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
              Find freelance gigs, collaborate on meaningful campus projects,
              and build a professional portfolio with your student community.
            </p>
            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                to={isAuthenticated ? "/gigs" : "/register"}
                className="btn-primary"
              >
                {isAuthenticated ? "Explore gigs" : "Get started"}{" "}
                <ArrowRight size={18} />
              </Link>
              <Link to="/gigs" className="btn-secondary">
                <Search size={18} />
                Browse opportunities
              </Link>
            </div>
          </div>
        </section>
        <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="eyebrow">Live opportunities</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                Gigs from the CampusCollab community
              </h2>
              <p className="mt-2 max-w-2xl text-slate-600">
                Every active published gig appears here, including gigs you
                created. Save favourites now and sign in for full details.
              </p>
            </div>
            <Link className="btn-secondary shrink-0" to="/gigs">
              View marketplace <ArrowRight size={17} />
            </Link>
          </div>
          {loading ? (
            <div className="mt-8 grid place-items-center rounded-3xl border border-slate-200 py-20">
              <Spinner label="Loading opportunities" />
            </div>
          ) : error ? (
            <div className="mt-8 rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center">
              <p className="font-semibold text-rose-700">{error}</p>
              <button className="btn-secondary mt-4" onClick={() => load()}>
                Try again
              </button>
            </div>
          ) : gigs.length ? (
            <>
              <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {gigs.map((gig) => (
                  <GigCard
                    key={gig.id}
                    gig={gig}
                    busy={busy === gig.id}
                    onBookmark={bookmark}
                  />
                ))}
              </div>
              {pagination.hasMore && (
                <div className="mt-8 text-center">
                  <button
                    className="btn-secondary"
                    disabled={loadingMore}
                    onClick={() => load(pagination.nextCursor, true)}
                  >
                    {loadingMore ? (
                      <Spinner label="Loading more" />
                    ) : (
                      "Load more gigs"
                    )}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="surface mt-8 p-12 text-center">
              <BriefcaseBusiness className="mx-auto text-slate-400" />
              <h3 className="mt-4 text-xl font-bold">
                No active published gigs yet
              </h3>
              <p className="mt-2 text-slate-600">
                Publish a draft or restore a previously published gig from
                Archive.
              </p>
              {isAuthenticated && (
                <Link className="btn-primary mt-5" to="/dashboard/gigs/new">
                  Create a gig
                </Link>
              )}
            </div>
          )}
        </section>
        <section className="border-t border-slate-100 bg-slate-50/70">
          <div className="mx-auto grid max-w-7xl gap-5 px-5 py-16 sm:px-8 md:grid-cols-3">
            {[
              [
                ShieldCheck,
                "Trusted by design",
                "University-domain access keeps the community focused and accountable.",
              ],
              [
                BriefcaseBusiness,
                "Experience, not busywork",
                "Find practical gigs aligned with the skills you want to grow.",
              ],
              [
                UsersRound,
                "Build with your peers",
                "Meet collaborators across disciplines and turn ideas into outcomes.",
              ],
            ].map(([Icon, title, text]) => (
              <article className="surface p-7" key={title}>
                <span className="grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                  <Icon />
                </span>
                <h2 className="mt-5 text-lg font-bold text-slate-900">
                  {title}
                </h2>
                <p className="mt-2 leading-7 text-slate-600">{text}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
