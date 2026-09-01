import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
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
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/gigs/new" element={<GigFormPage />} />
          <Route path="/gigs/:gigId/edit" element={<GigFormPage />} />
          <Route path="/my-gigs" element={<MyGigsPage />} />
          <Route
            path="/my-gigs/:gigId/proposals"
            element={<GigProposalsPage />}
          />
          <Route path="/proposals" element={<MyProposalsPage />} />
          <Route
            path="/proposals/:proposalId"
            element={<ProposalDetailsPage />}
          />
          <Route path="/bookmarks" element={<BookmarksPage />} />
          <Route path="/projects/new" element={<ProjectFormPage />} />
          <Route
            path="/projects/:projectId/edit"
            element={<ProjectFormPage />}
          />
          <Route path="/my-projects" element={<MyProjectsPage />} />
          <Route
            path="/my-projects/:projectId/manage"
            element={<ProjectManagePage />}
          />
          <Route
            path="/join-requests"
            element={<ParticipationInboxPage type="joins" />}
          />
          <Route
            path="/invitations"
            element={<ParticipationInboxPage type="invitations" />}
          />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
