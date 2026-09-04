import { lazy, Suspense } from 'react';
import { ErrorBoundary } from './components/common/ErrorBoundary';

// Route-level code splitting: a public viewer must not download the Studio bundle,
// and vice versa. Each route becomes its own chunk (Babylon is shared between them).
const ExhibitionViewer = lazy(() =>
  import('./components/viewer/ExhibitionViewer').then((m) => ({ default: m.ExhibitionViewer }))
);
const StudioApp = lazy(() =>
  import('./components/studio/StudioApp').then((m) => ({ default: m.StudioApp }))
);

/**
 * Simple client-side router:
 *   /e/:slug  → ExhibitionViewer (public)
 *   /studio   → StudioApp (curator CMS)
 *   /         → redirect to /studio
 */
function getRoute(): { type: 'viewer'; slug: string } | { type: 'studio' } | { type: 'home' } {
  const path = window.location.pathname;
  const slugMatch = path.match(/^\/e\/(.+)$/);
  if (slugMatch) return { type: 'viewer', slug: decodeURIComponent(slugMatch[1]) };
  if (path.startsWith('/studio')) return { type: 'studio' };
  return { type: 'home' };
}

export default function App() {
  const route = getRoute();

  return (
    <ErrorBoundary>
      <Suspense fallback={null}>
        {route.type === 'viewer' && <ExhibitionViewer slug={route.slug} />}
        {route.type === 'studio' && <StudioApp />}
        {route.type === 'home' && (() => {
          window.location.replace('/studio');
          return null;
        })()}
      </Suspense>
    </ErrorBoundary>
  );
}
