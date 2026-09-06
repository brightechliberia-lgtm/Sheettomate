import { useNavigate } from 'react-router-dom';

export default function BackButton() {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) {
          navigate(-1);
          return;
        }
        navigate('/');
      }}
      className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:text-gold"
    >
      ← Back
    </button>
  );
}
