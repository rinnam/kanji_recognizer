import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LEGACY_REDIRECTS, TAB_PARAM } from '../routes';
import { AppLayout } from './AppLayout';
import { NotFound } from './NotFound';

const WorkspacePage = lazy(() =>
  import('../pages/Workspace').then((module) => ({ default: module.WorkspacePage })),
);

/** Router gốc: một màn hình làm việc gộp (tab trong URL) + redirect path cũ + 404. */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <WorkspacePage /> },
      ...LEGACY_REDIRECTS.map((redirect) => ({
        path: redirect.path,
        element: <Navigate to={`/?${TAB_PARAM}=${redirect.tab}`} replace />,
      })),
      { path: '*', element: <NotFound /> },
    ],
  },
]);
