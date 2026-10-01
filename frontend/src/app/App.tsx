import { type ReactElement } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { AppProviders } from './AppProviders';

/** Điểm tích hợp cấp cao: providers (theme + IndexedDB) bọc router gốc. */
export function App(): ReactElement {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
