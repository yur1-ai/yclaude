import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createHashRouter } from 'react-router';
import Layout from './components/Layout';
import Models from './pages/Models';
import Overview from './pages/Overview';
import Projects from './pages/Projects';
import SessionDetail from './pages/SessionDetail';
import Sessions from './pages/Sessions';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const router = createHashRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Overview /> },
      { path: 'models', element: <Models /> },
      { path: 'projects', element: <Projects /> },
      { path: 'sessions', element: <Sessions /> },
      { path: 'sessions/:id', element: <SessionDetail /> },
    ],
  },
]);

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
