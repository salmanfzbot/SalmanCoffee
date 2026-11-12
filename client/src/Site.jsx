import React, { useEffect, useRef, useState } from 'react';
import { ART } from './art.js';
import { createBurst3D } from './burst3d.js';
import { UI, tx, pad2, applyTheme, loadContent, clamp } from './lib.js';

const LANG_KEY = 'salmanCoffee.lang';

export default function Site() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [lang, setLangState] = useState(() => {
    try { return localStorage.getItem(LANG_KEY) === 'ar' ? 'ar' : 'en'; } catch { return 'en'; }
  });
  const [active, setActive] = useState(0);
  const heroRef = useRef(null);
  const burstCanvasRef = useRef(null);

  useEffect(() => {
    loadContent().then(c => { applyTheme(c.theme); setData(c); }).catch(e => setErr(String(e.message || e)));
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  const ui = UI[lang];
  const cats = data ? data.categories.filter(c => data.items.some(i => i.cat === c.id)) : [];
  const featured = data ? data.items.filter(i => i.featured && cats.some(c => c.id === i.cat)) : [];
  const n = featured.length;

  // Scroll-driven hero: each scene is one featured dish. The photo cross-fades in the DOM; the ingredients
  // (beans, milk, glass, cinnamon, sugar) are real 3D meshes on one three.js canvas that leaves the cup in turn.
  useEffect(() => {
    if (!data || !n) return;
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let burst = null;
    try { burst = createBurst3D(burstCanvasRef.current, n); } catch (e) { burst = null; }
    let raf = 0;
    const update = () => {
      raf = 0;
      const hero = heroRef.current;
      if (!hero) return;
      const r = hero.getBoundingClientRect();
      const span = hero.offsetHeight - window.innerHeight;
      const p = reduce ? 0 : clamp(span > 0 ? -r.top / span : 0, 0, 0.9999);
      hero.style.setProperty('--p', p.toFixed(4));
      const scenes = hero.querySelectorAll('.scene');
      scenes.forEach((scene, i) => {
        const local = p * n - i;
        const op = clamp(1 - (Math.abs(local - 0.5) - 0.35) * 4, 0, 1);
        scene.style.setProperty('--op', op.toFixed(3));
      });
      if (burst) {
        const lift = burst.setFrame(p * n);
        hero.style.setProperty('--lift', lift.toFixed(3));
      }
      const idx = Math.min(n - 1, Math.floor(p * n));
      setActive(prev => (prev === idx ? prev : idx));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    const onResize = () => { if (burst) burst.resize(); onScroll(); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onResize);
      if (raf) cancelAnimationFrame(raf);
      if (burst) burst.dispose();
    };
  }, [data, n]);

  function setLang(l) {
    try { localStorage.setItem(LANG_KEY, l); } catch {}
    setLangState(l);
  }
  function goTo(id) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function goHero(i) {
    const hero = heroRef.current;
    if (!hero) return;
    const span = hero.offsetHeight - window.innerHeight;
    window.scrollTo({ top: hero.offsetTop + span * (i / n) + 4, behavior: 'smooth' });
  }

  if (err) return <p className="notice">The menu did not load. Please refresh.</p>;
  if (!data) return <p className="notice">…</p>;

  const shopName = tx(data.shop, 'name', lang);
  const phone = (data.shop.phone || '').replace(/[^+\d]/g, '');

  return (
    <div className="site" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <header className="top">
        <div className="brand">{shopName}</div>
        <nav className="links">
          <button onClick={() => goTo('menu')}>{ui.menu}</button>
          <button onClick={() => goTo('visit')}>{ui.visit}</button>
          <button className="lang" onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}>{ui.switchTo}</button>
          <a href="/admin">{ui.admin}</a>
        </nav>
      </header>

      {n > 0 && (
        <section className="hero" id="hero" ref={heroRef} style={{ height: n * 90 + 'vh' }}>
          <div className="stage">
            {featured.map((it, i) => {
              const cat = data.categories.find(c => c.id === it.cat) || {};
              return (
                <div className="scene" key={it.id} data-i={i}>
                  <div className={'art' + (it.image ? ' photo' : '')}>
                    {it.image
                      ? <img className="ph" src={it.image} alt="" loading={i === 0 ? 'eager' : 'lazy'} />
                      : <div className="cupart" dangerouslySetInnerHTML={{ __html: ART[it.art || cat.art] || ART.cup }} />}
                  </div>
                  <div className="num"><b>{pad2(i + 1)}<small> / {pad2(n)}</small></b><span>{tx(cat, 'name', lang)}</span></div>
                  <div className="copy">
                    <div className="name">{tx(it, 'name', lang)}</div>
                    <div className="sub">{tx(it, 'sub', lang)}</div>
                    <p className="d">{tx(it, 'desc', lang)}</p>
                    <div className="pr"><b>{it.price}</b> <small>{ui.sar}</small></div>
                  </div>
                </div>
              );
            })}
            <div className="burst" aria-hidden="true">
              <canvas ref={burstCanvasRef} className="burst-cv" />
            </div>
            <ol className="index">
              <li className="ix-h">{ui.table}</li>
              {featured.map((it, i) => (
                <li key={it.id} className={i === active ? 'on' : ''} onClick={() => goHero(i)}>
                  <span className="ix">{pad2(i + 1)}</span>{tx(it, 'name', lang)}
                </li>
              ))}
            </ol>
            <div className="index-hint">{ui.scroll}</div>
          </div>
        </section>
      )}

      <div className="catbar"><div className="catbar-in">
        {cats.map(c => <button key={c.id} className="chip" onClick={() => goTo('cat-' + c.id)}>{tx(c, 'name', lang)}</button>)}
      </div></div>

      <main className="menu" id="menu">
        {cats.map((c, ci) => (
          <section className="cat" id={'cat-' + c.id} key={c.id}>
            <div className="cat-head"><span className="cat-num">{pad2(ci + 1)}</span><h2 className="cat-title">{tx(c, 'name', lang)}</h2></div>
            <div className="grid">
              {data.items.filter(i => i.cat === c.id).map(it => (
                <article className="card" key={it.id}>
                  <div className="thumb">
                    {it.image
                      ? <img className="ph" src={it.image} alt="" loading="lazy" />
                      : <div className="cupart" dangerouslySetInnerHTML={{ __html: ART[it.art || c.art] || ART.cup }} />}
                  </div>
                  <div className="nm">{tx(it, 'name', lang)}</div>
                  <div className="sub">{tx(it, 'sub', lang)}</div>
                  <p className="d">{tx(it, 'desc', lang)}</p>
                  <div className="pr"><b>{it.price}</b><span>{ui.sar}</span></div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </main>

      <section className="visit" id="visit">
        <div className="visit-title">{ui.visitTitle}</div>
        <div className="visit-grid">
          <div><small>{ui.address}</small><p>{tx(data.shop, 'address', lang)}</p></div>
          <div><small>{ui.hours}</small><p>{tx(data.shop, 'hours', lang)}</p></div>
          <div><small>{ui.phone}</small><p dir="ltr">{data.shop.phone}</p>{phone && <a href={'tel:' + phone}>{data.shop.phone}</a>}</div>
        </div>
      </section>
      <footer className="foot">{ui.footer} <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>{ui.top}</button></footer>
    </div>
  );
}
