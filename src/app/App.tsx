import { Suspense, lazy, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useSession, LoginForm, RegisterForm, ForcedPasswordChange } from '@/features/auth';
import { Layout } from './Layout';
import { HomePage } from './HomePage';
import { LandingPage } from './LandingPage';
import { AuthGate } from './AuthGate';
import { AdminGate } from './AdminGate';
import { TermsPage } from './TermsPage';
import { ContactPage } from './ContactPage';
import { SplashScreen, shouldShowSplash, markSplashShown } from './SplashScreen';

// تحميل كسول للصفحات الثقيلة (محرر Tiptap، عارض PDF، توليد QR) كي لا يُحمَّل أي من
// ذلك ضمن الحزمة الأولى للصفحة الرئيسية العامة — هذا هو سبب البطء بعد الشاشة الترحيبية.
const ContractsListPage = lazy(() => import('@/features/contracts/components/ContractsListPage').then((m) => ({ default: m.ContractsListPage })));
const NewContractWizard = lazy(() => import('@/features/contracts/components/NewContractWizard').then((m) => ({ default: m.NewContractWizard })));
const ContractDetailPage = lazy(() => import('@/features/contracts/components/ContractDetailPage').then((m) => ({ default: m.ContractDetailPage })));
const DiscountCodesPage = lazy(() => import('@/features/contracts/components/DiscountCodesPage').then((m) => ({ default: m.DiscountCodesPage })));
const CreditCodesPage = lazy(() => import('@/features/contracts/components/CreditCodesPage').then((m) => ({ default: m.CreditCodesPage })));
const PricingSettingsPage = lazy(() => import('@/features/contracts/components/PricingSettingsPage').then((m) => ({ default: m.PricingSettingsPage })));
const BalancePage = lazy(() => import('@/features/contracts/components/BalancePage').then((m) => ({ default: m.BalancePage })));
const ProfilePage = lazy(() => import('@/features/auth/components/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const SettingsPage = lazy(() => import('@/features/auth/components/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const SigningPage = lazy(() => import('@/features/signing/components/SigningPage').then((m) => ({ default: m.SigningPage })));
const VerifyPage = lazy(() => import('@/features/verification/components/VerifyPage').then((m) => ({ default: m.VerifyPage })));
const ForgotPasswordForm = lazy(() =>
  import('@/features/auth/components/ForgotPasswordForm').then((m) => ({ default: m.ForgotPasswordForm })),
);

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper">
      <p className="font-bold text-slate">جارِ التحميل...</p>
    </div>
  );
}

function LoginPage() {
  const { loading, profile, refresh } = useSession();
  if (loading) return <LoadingScreen />;
  if (profile) return <Navigate to="/app" replace />;
  return <LoginForm onSignedIn={refresh} />;
}

function RegisterPage() {
  const { loading, profile, refresh } = useSession();
  if (loading) return <LoadingScreen />;
  if (profile) return <Navigate to="/app" replace />;
  return <RegisterForm onRegistered={refresh} />;
}

// يفتح "/app" بلا تسجيل دخول (تصفّح كضيف)؛ المسارات التي تُنشئ أو تُرسل عقودًا فعليًا
// محمية بـ AuthGate لأنها تتطلب حسابًا حقيقيًا (created_by مربوط بـ auth.uid عبر RLS).
function AppShell() {
  const { loading, profile, refresh } = useSession();

  if (loading) return <LoadingScreen />;

  if (profile?.must_change_password) {
    return <ForcedPasswordChange onDone={refresh} />;
  }

  return (
    <Layout profile={profile}>
      <Suspense fallback={<p className="text-sm text-slate">جارِ التحميل...</p>}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/contracts" element={profile ? <ContractsListPage /> : <AuthGate />} />
          <Route path="/contracts/new" element={profile ? <NewContractWizard /> : <AuthGate />} />
          <Route path="/contracts/:id" element={profile ? <ContractDetailPage /> : <AuthGate />} />
          <Route path="/balance" element={profile ? <BalancePage /> : <AuthGate />} />
          <Route path="/profile" element={profile ? <ProfilePage profile={profile} /> : <AuthGate />} />
          <Route path="/settings" element={profile ? <SettingsPage /> : <AuthGate />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/contracts/discounts" element={!profile ? <AuthGate /> : profile.role === 'admin' ? <DiscountCodesPage /> : <AdminGate />} />
          <Route path="/contracts/credit-codes" element={!profile ? <AuthGate /> : profile.role === 'admin' ? <CreditCodesPage /> : <AdminGate />} />
          <Route path="/contracts/pricing" element={!profile ? <AuthGate /> : profile.role === 'admin' ? <PricingSettingsPage /> : <AdminGate />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}

export function App() {
  const location = useLocation();
  // لا نعرض الشاشة الترحيبية لروابط توقيع خارجية (يريد الطرف الوصول للمستند مباشرة).
  const [showSplash, setShowSplash] = useState(
    () => shouldShowSplash() && !location.pathname.startsWith('/sign/') && !location.pathname.startsWith('/verify'),
  );

  if (showSplash) {
    return (
      <SplashScreen
        onDone={() => {
          markSplashShown();
          setShowSplash(false);
        }}
      />
    );
  }

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordForm />} />
        <Route path="/sign/:token" element={<SigningPage />} />
        <Route path="/verify" element={<VerifyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/app/*" element={<AppShell />} />
      </Routes>
    </Suspense>
  );
}
