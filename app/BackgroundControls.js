'use client';

import Icon from '../components/Icon';
import useBackgroundSettings from './useBackgroundSettings';
import './BackgroundControls.css';

const TEXTURES = [['off', 'None'], ['grain', 'Grain'], ['circuit', 'Circuit'], ['sparse', 'Sparse']];
export default function BackgroundControls() {
  const [settings, update] = useBackgroundSettings();
  const enabled = settings.texture !== 'off';
  const circuit = ['circuit', 'sparse'].includes(settings.texture);
  return <section className="background-controls" aria-label="Background settings">
    <h3><Icon name="layers" size={16} />Background</h3>
    <label className="background-check"><span>Show on sitemap</span><input type="checkbox" checked={settings.mapEnabled} onChange={event => update('mapEnabled', event.target.checked)} /></label>
    <fieldset><legend>Texture</legend><div className="background-textures">{TEXTURES.map(([value, label]) => <button type="button" key={value} aria-pressed={settings.texture === value} onClick={() => update('texture', value)}><Icon name={value === 'grain' ? 'grain' : value === 'off' ? 'minus' : 'network'} size={15} />{label}</button>)}</div></fieldset>
    <label className="background-range"><span>Visibility <output>{settings.visibility}%</output></span><input aria-label="Texture visibility" type="range" min="0" max="200" step="5" value={settings.visibility} disabled={!enabled} onChange={event => update('visibility', Number(event.target.value))} /></label>
    <label className="background-range"><span>Reflection contrast <output>{settings.contrast}%</output></span><input aria-label="Reflection contrast" type="range" min="0" max="100" step="5" value={settings.contrast} disabled={!enabled || (process.env.NODE_ENV === 'development' && settings.debug)} onChange={event => update('contrast', Number(event.target.value))} /></label>
    <label className="background-check"><span><Icon name="layers" size={15} />Isometric</span><input type="checkbox" disabled={!circuit} checked={circuit && settings.isometric} onChange={event => update('isometric', event.target.checked)} /></label>
    {process.env.NODE_ENV === 'development' && <label className="background-check"><span><Icon name="flask" size={15} />Fuchsia test</span><input type="checkbox" disabled={!enabled} checked={settings.debug} onChange={event => update('debug', event.target.checked)} /></label>}
    <p className="background-note">{process.env.NODE_ENV === 'development' && 'Fuchsia removes lighting and fading to inspect the pattern. '}Choices also apply to the landing page.</p>
  </section>;
}
