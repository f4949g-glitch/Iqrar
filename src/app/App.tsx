import { Navigate, Route, Routes } from 'react-router-dom';
import { useSession, LoginForm, RegisterForm, ForcedPasswordChange } from '@/features/auth';
import { ContractsListPage, NewContractWizard, ContractDetailPage, DiscountCodesPage } from '@/features/contracts';
import { SigningPage } from '@/features/signing';
import { Layout } from './Layout';
import { HomePage } from './HomePage';
import { LandingPage } from './LandingPage';
import { AuthGate } from './AuthGate';

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
        <Route path="/contracts/discounts" element={profile ? <DiscountCodesPage /> : <AuthGate />} />
        <Route path="/contracts/:id" element={profile ? <ContractDetailPage /> : <AuthGate />} />
      </Routes>
    </Layout>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/sign/:token" element={<SigningPage />} />
      <Route path="/app/*" element={<AppShell />} />
    </Routes>
  );
}
