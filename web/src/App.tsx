import { createHashRouter, RouterProvider } from 'react-router';
import Layout from './components/Layout';
import Overview from './pages/Overview';
import Models from './pages/Models';
import Projects from './pages/Projects';
import Sessions from './pages/Sessions';

const router = createHashRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Overview /> },
      { path: 'models', element: <Models /> },
      { path: 'projects', element: <Projects /> },
      { path: 'sessions', element: <Sessions /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
