import { lazy, Suspense } from 'react';
import { Outlet, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

const AdminLayout = lazy(() => import('./admin/AdminLayout'));

const HomePage = lazy(() => import('./pages/HomePage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const LegalPage = lazy(() => import('./pages/LegalPage'));
const BlogIndexPage = lazy(() => import('./pages/BlogIndexPage'));
const BlogPostPage = lazy(() => import('./pages/BlogPostPage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const CreatorDashboard = lazy(() => import('./pages/CreatorDashboard'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const GoogleDonePage = lazy(() => import('./pages/GoogleDonePage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const TemplatesPage = lazy(() => import('./pages/TemplatesPage'));
const TemplatesRedirect = lazy(() =>
  import('./pages/TemplatesPage').then((m) => ({ default: m.TemplatesRedirect })),
);
const BuildLandingPage = lazy(() => import('./pages/BuildLandingPage'));
const LearnLandingPage = lazy(() => import('./pages/LearnLandingPage'));
const CategoriesPage = lazy(() => import('./pages/CategoriesPage'));
const TemplateDetailPage = lazy(() => import('./pages/TemplateDetailPage'));
const CoursesPage = lazy(() => import('./pages/CoursesPage'));
const CourseDetailPage = lazy(() => import('./pages/CourseDetailPage'));
const CoursePlayerPage = lazy(() => import('./pages/CoursePlayerPage'));
const CertificatePage = lazy(() => import('./pages/CertificatePage'));
const InstructorDashboardPage = lazy(() => import('./pages/InstructorDashboardPage'));
const CourseBuilderPage = lazy(() => import('./pages/CourseBuilderPage'));
const AdminCoursesPage = lazy(() => import('./pages/AdminCoursesPage'));
const AiPage = lazy(() => import('./pages/AiPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const CommunityPage = lazy(() => import('./pages/CommunityPage'));
const ForumPage = lazy(() => import('./pages/ForumPage'));
const ForumThreadPage = lazy(() => import('./pages/ForumThreadPage'));
const ChallengesPage = lazy(() => import('./pages/ChallengesPage'));
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage'));
const PublicProfilePage = lazy(() => import('./pages/PublicProfilePage'));
const WorkspacesPage = lazy(() => import('./pages/WorkspacesPage'));
const WorkspaceDetailPage = lazy(() => import('./pages/WorkspaceDetailPage'));
const GuidelinesPage = lazy(() => import('./pages/GuidelinesPage'));
const AutomationsPage = lazy(() => import('./pages/AutomationsPage'));
const WorkflowBuilderPage = lazy(() => import('./pages/WorkflowBuilderPage'));
const WebhooksPage = lazy(() => import('./pages/WebhooksPage'));
const ApiKeysPage = lazy(() => import('./pages/ApiKeysPage'));
const DataExchangePage = lazy(() => import('./pages/DataExchangePage'));
const AdminAiPage = lazy(() => import('./pages/AdminAiPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const PaymentStatusPage = lazy(() => import('./pages/PaymentStatusPage'));
const PaymentHistoryPage = lazy(() => import('./pages/PaymentHistoryPage'));
const SandboxCardPage = lazy(() => import('./pages/SandboxCardPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage'));
const AdminOverviewPage = lazy(() => import('./pages/admin/AdminOverviewPage'));
const AdminUsersManagePage = lazy(() => import('./pages/admin/AdminUsersManagePage'));
const AdminTemplatesPage = lazy(() => import('./pages/admin/AdminTemplatesPage'));
const AdminPaymentsManagePage = lazy(() => import('./pages/admin/AdminPaymentsManagePage'));
const AdminCmsPage = lazy(() => import('./pages/admin/AdminCmsPage'));
const AdminModerationPage = lazy(() => import('./pages/admin/AdminModerationPage'));
const AdminAnalyticsPage = lazy(() => import('./pages/admin/AdminAnalyticsPage'));
const AdminReportsPage = lazy(() => import('./pages/admin/AdminReportsPage'));
const AdminHealthPage = lazy(() => import('./pages/admin/AdminHealthPage'));
const AdminSettingsPage = lazy(() => import('./pages/admin/AdminSettingsPage'));

function PublicShell() {
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

function Fallback() {
  return <p className="p-8 text-sm text-stone-500">Loading…</p>;
}

export default function App() {
  return (
    <Suspense fallback={<Fallback />}>
      <Routes>
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminOverviewPage />} />
          <Route path="users" element={<AdminUsersManagePage />} />
          <Route path="templates" element={<AdminTemplatesPage />} />
          <Route path="courses" element={<AdminCoursesPage />} />
          <Route path="payments" element={<AdminPaymentsManagePage />} />
          <Route path="cms" element={<AdminCmsPage />} />
          <Route path="moderation" element={<AdminModerationPage />} />
          <Route
            path="analytics/revenue"
            element={<AdminAnalyticsPage path="/admin/analytics/revenue" scope="analytics" title="Revenue analytics" />}
          />
          <Route
            path="analytics/users"
            element={<AdminAnalyticsPage path="/admin/analytics/users" scope="analytics" title="User analytics" />}
          />
          <Route
            path="analytics/content"
            element={<AdminAnalyticsPage path="/admin/analytics/content" scope="analytics" title="Content analytics" />}
          />
          <Route
            path="analytics/geo"
            element={<AdminAnalyticsPage path="/admin/analytics/geo" scope="analytics" title="Geographic" />}
          />
          <Route path="ai" element={<AdminAiPage />} />
          <Route path="reports" element={<AdminReportsPage />} />
          <Route path="health" element={<AdminHealthPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
        </Route>
        <Route element={<PublicShell />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/pricing" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/blog" element={<BlogIndexPage />} />
          <Route path="/blog/:slug" element={<BlogPostPage />} />
          <Route
            path="/terms"
            element={
              <LegalPage title="Terms of Service" path="/terms">
                {`By creating a Sheettomate account you agree to use the marketplace, AI builder, and Institute lawfully. Templates are licensed for your organization after purchase. Do not upload malware or infringing files. Payments are processed by BanffPay and mobile-money partners; Sheettomate does not store card PAN or CVV. We may suspend accounts that abuse the platform.`}
              </LegalPage>
            }
          />
          <Route
            path="/privacy"
            element={
              <LegalPage title="Privacy Policy" path="/privacy">
                {`We collect account details (name, email, phone, country), usage logs, and payment metadata (never full card numbers). Data is used to operate Sheettomate, prevent fraud, and send the newsletters you opt into. You may request deletion of your account. Hosting may occur on cloud providers outside Liberia; we apply reasonable security controls including hashed passwords and HTTPS in production.`}
              </LegalPage>
            }
          />
          <Route path="/community" element={<CommunityPage />} />
          <Route path="/community/forum" element={<ForumPage />} />
          <Route path="/community/forum/:id" element={<ForumThreadPage />} />
          <Route path="/community/challenges" element={<ChallengesPage />} />
          <Route path="/community/leaderboard" element={<LeaderboardPage />} />
          <Route path="/community/workspaces" element={<ProtectedRoute><WorkspacesPage /></ProtectedRoute>} />
          <Route path="/community/workspaces/:id" element={<ProtectedRoute><WorkspaceDetailPage /></ProtectedRoute>} />
          <Route path="/u/:id" element={<PublicProfilePage />} />
          <Route path="/guidelines" element={<GuidelinesPage />} />
          <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/google/done" element={<GoogleDonePage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/get-templates" element={<TemplatesPage />} />
          <Route path="/templates" element={<TemplatesRedirect />} />
          <Route path="/build" element={<BuildLandingPage />} />
          <Route path="/learn" element={<LearnLandingPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/templates/:id" element={<TemplateDetailPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
          <Route path="/payments/history" element={<ProtectedRoute><PaymentHistoryPage /></ProtectedRoute>} />
          <Route path="/payments/sandbox-card" element={<SandboxCardPage />} />
          <Route path="/payments/:id" element={<ProtectedRoute><PaymentStatusPage /></ProtectedRoute>} />
          <Route path="/creator" element={<ProtectedRoute roles={['CREATOR', 'ADMIN', 'USER']}><CreatorDashboard /></ProtectedRoute>} />
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/courses/:id" element={<CourseDetailPage />} />
          <Route path="/courses/:id/learn/:lessonId?" element={<ProtectedRoute><CoursePlayerPage /></ProtectedRoute>} />
          <Route path="/courses/:id/certificate" element={<ProtectedRoute><CertificatePage /></ProtectedRoute>} />
          <Route path="/instructor" element={<ProtectedRoute roles={['CREATOR', 'ADMIN']}><InstructorDashboardPage /></ProtectedRoute>} />
          <Route path="/instructor/courses/:id" element={<ProtectedRoute roles={['CREATOR', 'ADMIN']}><CourseBuilderPage /></ProtectedRoute>} />
          <Route path="/ai" element={<ProtectedRoute><AiPage /></ProtectedRoute>} />
          <Route path="/automations" element={<ProtectedRoute><AutomationsPage /></ProtectedRoute>} />
          <Route path="/automations/webhooks" element={<ProtectedRoute><WebhooksPage /></ProtectedRoute>} />
          <Route path="/automations/keys" element={<ProtectedRoute><ApiKeysPage /></ProtectedRoute>} />
          <Route path="/automations/data" element={<ProtectedRoute><DataExchangePage /></ProtectedRoute>} />
          <Route path="/automations/:id" element={<ProtectedRoute><WorkflowBuilderPage /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        </Route>
      </Routes>
    </Suspense>
  );
}
