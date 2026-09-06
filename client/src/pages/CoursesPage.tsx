import { Navigate } from 'react-router-dom';
import LearnLandingPage from './LearnLandingPage';

/** Legacy /courses URL → /learn landing */
export default function CoursesPage() {
  return <Navigate to="/learn" replace />;
}

export { default as LearnLandingPage } from './LearnLandingPage';
export type { CatalogCourse } from '../components/CourseCatalog';
