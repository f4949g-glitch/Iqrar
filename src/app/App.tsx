import { Route, Routes } from 'react-router-dom';
import { useSession, LoginForm, ForcedPasswordChange } from '@/features/auth';
import { ContractsListPage, NewContractWizard, ContractDetailPage, DiscountCodesPage } from '@/features/contracts';
import { SigningPage } from '@/features/signing';
import { Layout } from './Layout';
import { HomePage } from './HomePage';

function AuthenticatedGate() {
  const { loading, profile, refresh } = useSession();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <p className="font-bold text-slate">جارِ التحميل...</p>
      </div>
    );
  }

  if (!profile) {
    return <LoginForm onSignedIn={refresh} />;
  }

  if (profile.must_change_password) {
    return <ForcedPasswordChange onDone={refresh} />;
  }

  return (
    <Layout profile={profile}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/contracts" element={<ContractsListPage />} />
        <Route path="/contracts/new" element={<NewContractWizard />} />
        <Route path="/contracts/discounts" element={<DiscountCodesPage />} />
        <Route path="/contracts/:id" element={<ContractDetailPage />} />
      </Routes>
    </Layout>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/sign/:token" element={<SigningPage />} />
      <Route path="/*" element={<AuthenticatedGate />} />
    </Routes>
  );
}
