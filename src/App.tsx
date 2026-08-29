import { ExhibitionViewer } from './components/viewer/ExhibitionViewer';
import { StudioApp } from './components/studio/StudioApp';
import { ErrorBoundary } from './components/common/ErrorBoundary';

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
      {route.type === 'viewer' && <ExhibitionViewer slug={route.slug} />}
      {route.type === 'studio' && <StudioApp />}
      {route.type === 'home' && (() => {
        window.location.replace('/studio');
        return null;
      })()}
    </ErrorBoundary>
  );
}
