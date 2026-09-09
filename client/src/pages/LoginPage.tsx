import { Link } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo';
import LoginForm from '../components/LoginForm';

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md space-y-4">
      <div className="flex justify-center pt-2">
        <BrandLogo size="lg" />
      </div>
      <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-brand-800">Log in</h1>
        <p className="mt-1 text-sm text-stone-600">Use your verified Sheettomate email.</p>
        <div className="mt-6">
          <LoginForm />
        </div>
        <p className="mt-4 text-sm text-stone-600">
          New here?{' '}
          <Link to="/register" className="text-brand-700 font-semibold">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
