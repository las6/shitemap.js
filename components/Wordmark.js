import { version } from '../package.json';

// Parentheses are a visual spelling; the accessible name stays pronounceable.
export default function Wordmark() {
  return <span className="wordmark" aria-label={`Shitemap.js, version ${version}`}>S<span className="wordmark-aside">(h)</span>itemap<span className="wordmark-suffix">.js</span><span className="wordmark-version" title={`Version ${version}`}>v{version}</span></span>;
}
