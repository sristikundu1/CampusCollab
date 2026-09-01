import { Spinner } from "../Spinner.jsx";
import { useAuth } from "../../context/auth-context.js";
import { AppShell } from "../../layouts/AppShell.jsx";
import { SiteFooter } from "../navigation/SiteFooter.jsx";
import { SiteHeader } from "../navigation/SiteHeader.jsx";

export function MarketplaceLayout({ children }) {
  const { loading, isAuthenticated } = useAuth();
  if (loading)
    return (
      <div className="grid min-h-screen place-items-center">
        <Spinner label="Loading CampusCollab" />
      </div>
    );
  if (isAuthenticated) return <AppShell>{children}</AppShell>;
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6 lg:p-10">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
