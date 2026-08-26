import { ExhibitionViewer } from './components/viewer/ExhibitionViewer';
import { StudioApp } from './components/studio/StudioApp';

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

  if (route.type === 'viewer') {
    return <ExhibitionViewer slug={route.slug} />;
  }

  if (route.type === 'studio') {
    return <StudioApp />;
  }

  // Home → redirect to studio
  window.location.replace('/studio');
  return null;
}
