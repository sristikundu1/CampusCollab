import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useParams } from "react-router-dom";
import {
  LoginRequiredRoute,
  ProtectedRoute,
  PublicOnlyRoute,
} from "./routes/RouteGuards.jsx";

const BookmarksPage = lazy(() =>
  import("./pages/BookmarksPage.jsx").then((module) => ({
    default: module.BookmarksPage,
  })),
);
const DashboardPage = lazy(() =>
  import("./pages/DashboardPage.jsx").then((module) => ({
    default: module.DashboardPage,
  })),
);
const ForgotPasswordPage = lazy(() =>
  import("./pages/ForgotPasswordPage.jsx").then((module) => ({
    default: module.ForgotPasswordPage,
  })),
);
const GigDetailsPage = lazy(() =>
  import("./pages/GigDetailsPage.jsx").then((module) => ({
    default: module.GigDetailsPage,
  })),
);
const GigFormPage = lazy(() =>
  import("./pages/GigFormPage.jsx").then((module) => ({
    default: module.GigFormPage,
  })),
);
const GigsPage = lazy(() =>
  import("./pages/GigsPage.jsx").then((module) => ({
    default: module.GigsPage,
  })),
);
const HomePage = lazy(() =>
  import("./pages/HomePage.jsx").then((module) => ({
    default: module.HomePage,
  })),
);
const LoginPage = lazy(() =>
  import("./pages/LoginPage.jsx").then((module) => ({
    default: module.LoginPage,
  })),
);
const MyGigsPage = lazy(() =>
  import("./pages/MyGigsPage.jsx").then((module) => ({
    default: module.MyGigsPage,
  })),
);
const MyProposalsPage = lazy(() =>
  import("./pages/MyProposalsPage.jsx").then((module) => ({
    default: module.MyProposalsPage,
  })),
);
const ProposalDetailsPage = lazy(() =>
  import("./pages/ProposalDetailsPage.jsx").then((module) => ({
    default: module.ProposalDetailsPage,
  })),
);
const GigProposalsPage = lazy(() =>
  import("./pages/GigProposalsPage.jsx").then((module) => ({
    default: module.GigProposalsPage,
  })),
);
const NotFoundPage = lazy(() =>
  import("./pages/NotFoundPage.jsx").then((module) => ({
    default: module.NotFoundPage,
  })),
);
const ProfilePage = lazy(() =>
  import("./pages/ProfilePage.jsx").then((module) => ({
    default: module.ProfilePage,
  })),
);
const ProfileOnboardingPage = lazy(() =>
  import("./pages/ProfileOnboardingPage.jsx").then((module) => ({
    default: module.ProfileOnboardingPage,
  })),
);
const PublicProfilePage = lazy(() =>
  import("./pages/PublicProfilePage.jsx").then((module) => ({
    default: module.PublicProfilePage,
  })),
);
const RegisterPage = lazy(() =>
  import("./pages/RegisterPage.jsx").then((module) => ({
    default: module.RegisterPage,
  })),
);
const ResetPasswordPage = lazy(() =>
  import("./pages/ResetPasswordPage.jsx").then((module) => ({
    default: module.ResetPasswordPage,
  })),
);
const VerifyEmailPage = lazy(() =>
  import("./pages/VerifyEmailPage.jsx").then((module) => ({
    default: module.VerifyEmailPage,
  })),
);
const ProjectsPage = lazy(() =>
  import("./pages/ProjectsPage.jsx").then((module) => ({
    default: module.ProjectsPage,
  })),
);
const ProjectDetailsPage = lazy(() =>
  import("./pages/ProjectDetailsPage.jsx").then((module) => ({
    default: module.ProjectDetailsPage,
  })),
);
const ProjectFormPage = lazy(() =>
  import("./pages/ProjectFormPage.jsx").then((module) => ({
    default: module.ProjectFormPage,
  })),
);
const MyProjectsPage = lazy(() =>
  import("./pages/MyProjectsPage.jsx").then((module) => ({
    default: module.MyProjectsPage,
  })),
);
const ProjectManagePage = lazy(() =>
  import("./pages/ProjectManagePage.jsx").then((module) => ({
    default: module.ProjectManagePage,
  })),
);
const ParticipationInboxPage = lazy(() =>
  import("./pages/ParticipationInboxPage.jsx").then((module) => ({
    default: module.ParticipationInboxPage,
  })),
);

function PageFallback() {
  return (
    <div
      className="grid min-h-screen place-items-center bg-slate-50"
      role="status"
    >
      <span className="text-sm font-semibold text-slate-600">
        Loading CampusCollab…
      </span>
    </div>
  );
}

function LegacyDashboardRedirect({ buildPath }) {
  const params = useParams();
  return <Navigate replace to={buildPath(params)} />;
}

export function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/students/:userId" element={<PublicProfilePage />} />
        <Route path="/gigs" element={<GigsPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:projectId" element={<ProjectDetailsPage />} />
        <Route element={<LoginRequiredRoute />}>
          <Route path="/gigs/:gigId" element={<GigDetailsPage />} />
        </Route>
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/dashboard/profile" element={<ProfilePage />} />
          <Route
            path="/dashboard/onboarding"
            element={<ProfileOnboardingPage />}
          />
          <Route path="/dashboard/gigs" element={<MyGigsPage />} />
          <Route
            path="/dashboard/gig"
            element={<Navigate replace to="/dashboard/gigs" />}
          />
          <Route path="/dashboard/gigs/new" element={<GigFormPage />} />
          <Route path="/dashboard/gigs/:gigId/edit" element={<GigFormPage />} />
          <Route
            path="/dashboard/gigs/:gigId/proposals"
            element={<GigProposalsPage />}
          />
          <Route path="/dashboard/proposals" element={<MyProposalsPage />} />
          <Route
            path="/dashboard/proposals/:proposalId"
            element={<ProposalDetailsPage />}
          />
          <Route path="/dashboard/bookmarks" element={<BookmarksPage />} />
          <Route path="/dashboard/projects" element={<MyProjectsPage />} />
          <Route path="/dashboard/projects/new" element={<ProjectFormPage />} />
          <Route
            path="/dashboard/projects/:projectId/edit"
            element={<ProjectFormPage />}
          />
          <Route
            path="/dashboard/projects/:projectId/manage"
            element={<ProjectManagePage />}
          />
          <Route
            path="/dashboard/join-requests"
            element={<ParticipationInboxPage type="joins" />}
          />
          <Route
            path="/dashboard/invitations"
            element={<ParticipationInboxPage type="invitations" />}
          />
          <Route
            path="/profile"
            element={<Navigate replace to="/dashboard/profile" />}
          />
          <Route
            path="/my-gigs"
            element={<Navigate replace to="/dashboard/gigs" />}
          />
          <Route
            path="/gigs/new"
            element={<Navigate replace to="/dashboard/gigs/new" />}
          />
          <Route
            path="/gigs/:gigId/edit"
            element={
              <LegacyDashboardRedirect
                buildPath={({ gigId }) => `/dashboard/gigs/${gigId}/edit`}
              />
            }
          />
          <Route
            path="/my-gigs/:gigId/proposals"
            element={
              <LegacyDashboardRedirect
                buildPath={({ gigId }) => `/dashboard/gigs/${gigId}/proposals`}
              />
            }
          />
          <Route
            path="/proposals"
            element={<Navigate replace to="/dashboard/proposals" />}
          />
          <Route
            path="/proposals/:proposalId"
            element={
              <LegacyDashboardRedirect
                buildPath={({ proposalId }) =>
                  `/dashboard/proposals/${proposalId}`
                }
              />
            }
          />
          <Route
            path="/bookmarks"
            element={<Navigate replace to="/dashboard/bookmarks" />}
          />
          <Route
            path="/my-projects"
            element={<Navigate replace to="/dashboard/projects" />}
          />
          <Route
            path="/projects/new"
            element={<Navigate replace to="/dashboard/projects/new" />}
          />
          <Route
            path="/projects/:projectId/edit"
            element={
              <LegacyDashboardRedirect
                buildPath={({ projectId }) =>
                  `/dashboard/projects/${projectId}/edit`
                }
              />
            }
          />
          <Route
            path="/my-projects/:projectId/manage"
            element={
              <LegacyDashboardRedirect
                buildPath={({ projectId }) =>
                  `/dashboard/projects/${projectId}/manage`
                }
              />
            }
          />
          <Route
            path="/join-requests"
            element={<Navigate replace to="/dashboard/join-requests" />}
          />
          <Route
            path="/invitations"
            element={<Navigate replace to="/dashboard/invitations" />}
          />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
