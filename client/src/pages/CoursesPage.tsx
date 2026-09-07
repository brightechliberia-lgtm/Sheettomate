import { Navigate } from 'react-router-dom';

/** Legacy /courses URL → /learn landing */
export default function CoursesPage() {
  return <Navigate to="/learn" replace />;
}
