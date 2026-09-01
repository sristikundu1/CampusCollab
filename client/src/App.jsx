import { Route, Routes } from 'react-router-dom';
import { BookmarksPage } from './pages/BookmarksPage.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage.jsx';
import { GigDetailsPage } from './pages/GigDetailsPage.jsx';
import { GigFormPage } from './pages/GigFormPage.jsx';
import { GigsPage } from './pages/GigsPage.jsx';
import { HomePage } from './pages/HomePage.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { MyGigsPage } from './pages/MyGigsPage.jsx';
import { MyProposalsPage } from './pages/MyProposalsPage.jsx';
import { ProposalDetailsPage } from './pages/ProposalDetailsPage.jsx';
import { GigProposalsPage } from './pages/GigProposalsPage.jsx';
import { NotFoundPage } from './pages/NotFoundPage.jsx';
import { ProfilePage } from './pages/ProfilePage.jsx';
import { PublicProfilePage } from './pages/PublicProfilePage.jsx';
import { RegisterPage } from './pages/RegisterPage.jsx';
import { ResetPasswordPage } from './pages/ResetPasswordPage.jsx';
import { VerifyEmailPage } from './pages/VerifyEmailPage.jsx';
import { ProjectsPage } from './pages/ProjectsPage.jsx';
import { ProjectDetailsPage } from './pages/ProjectDetailsPage.jsx';
import { ProjectFormPage } from './pages/ProjectFormPage.jsx';
import { MyProjectsPage } from './pages/MyProjectsPage.jsx';
import { ProjectManagePage } from './pages/ProjectManagePage.jsx';
import { ParticipationInboxPage } from './pages/ParticipationInboxPage.jsx';
import { LoginRequiredRoute, ProtectedRoute, PublicOnlyRoute } from './routes/RouteGuards.jsx';

export function App() {
  return <Routes>
    <Route path="/" element={<HomePage/>}/>
    <Route path="/students/:userId" element={<PublicProfilePage/>}/>
    <Route path="/gigs" element={<GigsPage/>}/>
    <Route path="/projects" element={<ProjectsPage/>}/>
    <Route path="/projects/:projectId" element={<ProjectDetailsPage/>}/>
    <Route element={<LoginRequiredRoute/>}><Route path="/gigs/:gigId" element={<GigDetailsPage/>}/></Route>
    <Route element={<PublicOnlyRoute/>}><Route path="/login" element={<LoginPage/>}/><Route path="/register" element={<RegisterPage/>}/><Route path="/verify-email" element={<VerifyEmailPage/>}/><Route path="/forgot-password" element={<ForgotPasswordPage/>}/><Route path="/reset-password" element={<ResetPasswordPage/>}/></Route>
    <Route element={<ProtectedRoute/>}><Route path="/dashboard" element={<DashboardPage/>}/><Route path="/profile" element={<ProfilePage/>}/><Route path="/gigs/new" element={<GigFormPage/>}/><Route path="/gigs/:gigId/edit" element={<GigFormPage/>}/><Route path="/my-gigs" element={<MyGigsPage/>}/><Route path="/my-gigs/:gigId/proposals" element={<GigProposalsPage/>}/><Route path="/proposals" element={<MyProposalsPage/>}/><Route path="/proposals/:proposalId" element={<ProposalDetailsPage/>}/><Route path="/bookmarks" element={<BookmarksPage/>}/><Route path="/projects/new" element={<ProjectFormPage/>}/><Route path="/projects/:projectId/edit" element={<ProjectFormPage/>}/><Route path="/my-projects" element={<MyProjectsPage/>}/><Route path="/my-projects/:projectId/manage" element={<ProjectManagePage/>}/><Route path="/join-requests" element={<ParticipationInboxPage type="joins"/>}/><Route path="/invitations" element={<ParticipationInboxPage type="invitations"/>}/></Route>
    <Route path="*" element={<NotFoundPage/>}/>
  </Routes>;
}
