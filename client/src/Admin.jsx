import React, { useEffect, useState } from 'react';
import { THEME_KEYS, THEME_LABELS, THEME_PRESETS, applyTheme, loadContent, tx } from './lib.js';

const TOKEN_KEY = 'salmanCoffee.adminToken';

export default function Admin() {
  const [token, setToken] = useState(() => { try { return sessionStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; } });
  const [pin, setPin] = useState('');
  const [gateMsg, setGateMsg] = useState('');
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => { loadContent().then(c => { setData(c); applyTheme(c.theme); }).catch(() => setStatus('Could not load the menu.')); }, []);

  async function signIn(e) {
    e.preventDefault();
    setGateMsg('');
    try {
      const r = await fetch('/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ pin }) });
      const j = await r.json();
      if (!r.ok || !j.ok) { setGateMsg(j.error || 'Wrong PIN'); return; }
      sessionStorage.setItem(TOKEN_KEY, j.token);
      setToken(j.token); setPin('');
    } catch { setGateMsg('Could not reach the server.'); }
  }
  function signOut() { try { sessionStorage.removeItem(TOKEN_KEY); } catch {} setToken(''); }

  function edit(fn) { setData(prev => { const c = structuredClone(prev); fn(c); return c; }); setDirty(true); setStatus(''); }

  function setTheme(theme) { edit(c => { c.theme = { ...theme }; }); applyTheme(theme); }

  async function save() {
    setStatus('Saving…');
    try {
      const r = await fetch('/api/data', { method: 'PUT', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token }, body: JSON.stringify(data) });
      const j = await r.json();
      if (r.status === 401) { signOut(); setGateMsg('Your admin session ended. Sign in again.'); return; }
      if (!r.ok || !j.ok) { setStatus(j.error || 'Not saved.'); return; }
      setDirty(false); setStatus('Saved. Visitors see it on their next load.');
    } catch { setStatus('Not saved: the server did not answer.'); }
  }

  if (!token) {
    return (
      <div className="admin gate">
        <form onSubmit={signIn} className="gate-box">
          <h1>Salman Coffee · Admin</h1>
          <label>PIN<input type="password" inputMode="numeric" autoComplete="current-password" value={pin} onChange={e => setPin(e.target.value)} /></label>
          <button className="btn" type="submit">Sign in</button>
          {gateMsg && <p className="msg">{gateMsg}</p>}
          <a href="/">Back to the menu</a>
        </form>
      </div>
    );
  }
  if (!data) return <div className="admin"><p>{status || '…'}</p></div>;

  const cats = data.categories;
  const shop = data.shop;
  const setShop = (k, v) => edit(c => { c.shop[k] = v; });
  const setItem = (id, k, v) => edit(c => { const it = c.items.find(x => x.id === id); if (it) it[k] = v; });
  const removeItem = id => edit(c => { c.items = c.items.filter(x => x.id !== id); });
  const addItem = cat => edit(c => {
    const id = cat + '-' + Date.now().toString(36).slice(-5);
    c.items.push({ id, cat, name_en: 'New item', name_ar: 'صنف جديد', sub_en: '', sub_ar: '', desc_en: '', desc_ar: '', price: 0, featured: false, art: '' });
  });
  const setCat = (id, k, v) => edit(c => { const ca = c.categories.find(x => x.id === id); if (ca) ca[k] = v; });

  return (
    <div className="admin">
      <header className="admin-top">
        <b>Salman Coffee · Admin</b>
        <span>
          <a href="/" target="_blank" rel="noreferrer">Open the menu</a>{' '}
          <button className="btn ghost" onClick={signOut}>Sign out</button>
        </span>
      </header>

      <section className="panel">
        <h2>Colours</h2>
        <div className="presets">
          {THEME_PRESETS.map(p => (
            <button key={p.name} className="btn ghost" onClick={() => setTheme(p.theme)}>{p.name}</button>
          ))}
        </div>
        <div className="colours">
          {THEME_KEYS.map(k => (
            <label key={k}>{THEME_LABELS[k]}
              <input type="color" value={data.theme[k]} onChange={e => { const t = { ...data.theme, [k]: e.target.value }; setTheme(t); }} />
            </label>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Shop</h2>
        <div className="fields">
          {['name_en', 'name_ar', 'tagline_en', 'tagline_ar', 'address_en', 'address_ar', 'hours_en', 'hours_ar', 'phone'].map(k => (
            <label key={k}>{k.replace('_', ' ')}
              <input value={shop[k] || ''} onChange={e => setShop(k, e.target.value)} />
            </label>
          ))}
        </div>
      </section>

      {cats.map(c => (
        <section className="panel" key={c.id}>
          <h2><input className="cat-in" value={c.name_en} onChange={e => setCat(c.id, 'name_en', e.target.value)} /> <input className="cat-in" dir="rtl" value={c.name_ar} onChange={e => setCat(c.id, 'name_ar', e.target.value)} /></h2>
          {data.items.filter(i => i.cat === c.id).map(it => (
            <div className="row" key={it.id}>
              <input value={it.name_en} onChange={e => setItem(it.id, 'name_en', e.target.value)} aria-label="Name (English)" />
              <input dir="rtl" value={it.name_ar} onChange={e => setItem(it.id, 'name_ar', e.target.value)} aria-label="Name (Arabic)" />
              <input className="price" type="number" min="0" step="0.5" value={it.price} onChange={e => setItem(it.id, 'price', Number(e.target.value))} aria-label="Price SAR" />
              <label className="feat"><input type="checkbox" checked={!!it.featured} onChange={e => setItem(it.id, 'featured', e.target.checked)} /> hero</label>
              <input className="desc" value={it.desc_en || ''} onChange={e => setItem(it.id, 'desc_en', e.target.value)} aria-label="Description (English)" />
              <input className="desc" dir="rtl" value={it.desc_ar || ''} onChange={e => setItem(it.id, 'desc_ar', e.target.value)} aria-label="Description (Arabic)" />
              <button className="btn ghost small" onClick={() => { if (confirm('Remove this item?')) removeItem(it.id); }}>Remove</button>
            </div>
          ))}
          <button className="btn ghost small" onClick={() => addItem(c.id)}>+ Add item to {c.name_en}</button>
        </section>
      ))}

      <div className="savebar">
        <button className="btn" disabled={!dirty} onClick={save}>Save changes</button>
        <span className="msg">{status}{dirty && !status ? ' Unsaved changes.' : ''}</span>
      </div>
    </div>
  );
}
