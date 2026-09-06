import { FormEvent, useState } from 'react';
import { WEST_AFRICAN_COUNTRIES } from '@sheetomate/shared';
import { useAuth, type RegisterPayload } from '../context/AuthContext';
import GoogleAuthButton from './GoogleAuthButton';

const initialErrors: Record<string, string> = {};

export default function RegistrationForm({
  onSuccess,
}: {
  onSuccess: (result: { email: string; verifyUrl?: string }) => void;
}) {
  const { register } = useAuth();
  const [errors, setErrors] = useState<Record<string, string>>(initialErrors);
  const [formError, setFormError] = useState('');
  const [pending, setPending] = useState(false);

  function validate(payload: RegisterPayload): Record<string, string> {
    const next: Record<string, string> = {};
    if (payload.name.trim().length < 2) next.name = 'Enter your full name';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) next.email = 'Enter a valid email';
    if (payload.password.length < 8) next.password = 'At least 8 characters';
    else if (!/[A-Za-z]/.test(payload.password) || !/\d/.test(payload.password)) {
      next.password = 'Include a letter and a number';
    }
    if (payload.phone.replace(/\D/g, '').length < 8) next.phone = 'Enter a valid phone number';
    return next;
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload: RegisterPayload = {
      name: String(form.get('name')),
      email: String(form.get('email')),
      password: String(form.get('password')),
      phone: String(form.get('phone')),
      country: String(form.get('country')),
      role: String(form.get('role')),
    };
    const fieldErrors = validate(payload);
    setErrors(fieldErrors);
    setFormError('');
    if (Object.keys(fieldErrors).length) return;

    setPending(true);
    try {
      const result = await register(payload);
      onSuccess({ email: payload.email, verifyUrl: result.verifyUrl });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit} noValidate>
      <Field name="name" label="Full name" error={errors.name} />
      <Field name="email" label="Email" type="email" error={errors.email} />
      <Field name="phone" label="Phone (Orange / Mobile Money)" error={errors.phone} />
      <Field
        name="password"
        label="Password"
        type="password"
        error={errors.password}
        hint="Min 8 characters, include a letter and a number"
      />
      <label className="block text-sm font-medium">
        Country
        <select name="country" className="mt-1 w-full rounded-lg border px-3 py-2" defaultValue="LR">
          {WEST_AFRICAN_COUNTRIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-medium">
        Account type
        <select name="role" className="mt-1 w-full rounded-lg border px-3 py-2" defaultValue="USER">
          <option value="USER">Buyer / AI user</option>
          <option value="CREATOR">Creator (sell templates)</option>
          <option value="LEARNER">Learner (courses)</option>
        </select>
      </label>
      {formError && <p className="text-sm text-red-600">{formError}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-brand-600 py-2 font-semibold text-white disabled:opacity-60"
      >
        {pending ? 'Creating account...' : 'Create account'}
      </button>
      <div className="relative py-2 text-center text-xs text-stone-400">or</div>
      <GoogleAuthButton label="Sign up with Google" />
    </form>
  );
}

function Field({
  name,
  label,
  type = 'text',
  error,
  hint,
}: {
  name: string;
  label: string;
  type?: string;
  error?: string;
  hint?: string;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input name={name} type={type} className="mt-1 w-full rounded-lg border px-3 py-2" />
      {hint && <span className="mt-1 block text-xs font-normal text-stone-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}
