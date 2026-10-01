import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ROUTE_PATHS, ROUTES } from '../routes';
import { AppLayout } from './AppLayout';
import { NotFound } from './NotFound';

const LibraryPage = lazy(() =>
  import('../pages/Library').then((module) => ({ default: module.LibraryPage })),
);
const StudyPage = lazy(() =>
  import('../pages/Study').then((module) => ({ default: module.StudyPage })),
);
const QuizPage = lazy(() =>
  import('../pages/Quiz').then((module) => ({ default: module.QuizPage })),
);

/** Router gốc: layout chung + các trang nạp lười (React.lazy) + 404. */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to={ROUTES.library} replace /> },
      { path: ROUTE_PATHS.library, element: <LibraryPage /> },
      { path: ROUTE_PATHS.study, element: <StudyPage /> },
      { path: ROUTE_PATHS.quiz, element: <QuizPage /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);
