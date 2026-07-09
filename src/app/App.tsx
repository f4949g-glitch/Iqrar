import { useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useSession, LoginForm, RegisterForm, ForcedPasswordChange, ProfilePage, SettingsPage } from '@/features/auth';
import {
  ContractsListPage,
  NewContractWizard,
  ContractDetailPage,
  DiscountCodesPage,
  CreditCodesPage,
  PricingSettingsPage,
  BalancePage,
} from '@/features/contracts';
import { SigningPage } from '@/features/signing';
import { VerifyPage } from '@/features/verification/components/VerifyPage';
import { Layout } from './Layout';
import { HomePage } from './HomePage';
import { LandingPage } from './LandingPage';
import { AuthGate } from './AuthGate';
import { AdminGate } from './AdminGate';
import { TermsPage } from './TermsPage';
import { ContactPage } from './ContactPage';
import { SplashScreen, shouldShowSplash, markSplashShown } from './SplashScreen';

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
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/sign/:token" element={<SigningPage />} />
      <Route path="/verify" element={<VerifyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/app/*" element={<AppShell />} />
    </Routes>
  );
}
