export type Sector = { id: string; label: string; selector: string; el?: HTMLElement | null };

export function getHomeSectors(): Sector[] {
  return [
    { id: 'directive', label: '01 DIRECTIVE', selector: '.manifesto' },
    { id: 'anomaly',   label: '02 ANOMALY',   selector: '.section-solve' },
    { id: 'constell',  label: '03 CONSTELL',  selector: '.section-skills' },
    { id: 'vector',    label: '04 VECTOR',    selector: '.mission-bar' },
    { id: 'stargate',  label: '05 STARGATE',  selector: '.section-journey-teaser' },
    { id: 'plan',      label: '06 PLAN',      selector: '#roadmap' },
    { id: 'logs',      label: '07 LOGS',      selector: '[data-sector="logs"]' },
  ];
}

export function computeMostVisibleSector(
  sectors: Sector[],
  viewportH: number,
): { index: number; id: string; visibility: number } {
  let best = { index: 0, id: sectors[0]?.id ?? 'directive', visibility: 0 };
  sectors.forEach((s, i) => {
    if (!s.el) return;
    const rect = s.el.getBoundingClientRect();
    const visible = Math.max(0, Math.min(rect.bottom, viewportH) - Math.max(rect.top, 0));
    const ratio = visible / Math.max(rect.height, 1);
    if (ratio > best.visibility) best = { index: i, id: s.id, visibility: ratio };
  });
  return best;
}

export function sampleCharge(el: HTMLElement, viewportH: number): number {
  const rect = el.getBoundingClientRect();
  const visible = Math.max(0, Math.min(rect.bottom, viewportH) - Math.max(rect.top, 0));
  return Math.min(1, visible / Math.max(rect.height * 0.65, 1));
}

function applyReducedMotionDefaults(style: CSSStyleDeclaration) {
  style.setProperty('--home-scroll-p', '1');
  style.setProperty('--home-scroll-vel', '0');
  style.setProperty('--hero-depth', '0');
  style.setProperty('--stargate-proximity', '0');
  for (let i = 0; i < 4; i++) style.setProperty(`--solve-charge-${i}`, '1');
}

export function initHomeScrollSync(): (() => void) | undefined {
  const style = document.documentElement.style;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduce) {
    applyReducedMotionDefaults(style);
    return;
  }

  const sectors = getHomeSectors()
    .map(s => ({ ...s, el: document.querySelector<HTMLElement>(s.selector) }))
    .filter(s => s.el);

  const chargeables = Array.from(document.querySelectorAll<HTMLElement>('[data-chargeable]'));
  const heroSection = document.querySelector<HTMLElement>('.hero-section');
  const hud = document.querySelector<HTMLElement>('[data-home-hud]');
  const mobileLabel = document.querySelector<HTMLElement>('.mobile-sector-label');
  const pctEl = document.querySelector<HTMLElement>('.hud-progress-pct');
  const fillEl = document.querySelector<HTMLElement>('.hud-progress-fill');

  let ticking = false;
  let lastY = window.scrollY;
  let lastT = performance.now();

  function tick() {
    ticking = false;
    const now = performance.now();
    const scrollY = window.scrollY;
    const viewportH = window.innerHeight;
    const docH = document.documentElement.scrollHeight;

    const maxScroll = Math.max(1, docH - viewportH);
    const p = Math.min(1, scrollY / maxScroll);

    const dt = Math.max(1, now - lastT);
    const vel = Math.min(1, Math.abs(scrollY - lastY) / dt / 2);
    lastY = scrollY;
    lastT = now;

    const most = computeMostVisibleSector(sectors, viewportH);

    let heroDepth = 0;
    if (heroSection) {
      const r = heroSection.getBoundingClientRect();
      heroDepth = Math.max(0, Math.min(1, -r.top / Math.max(r.height * 0.6, 1)));
    }

    let stargateProx = 0;
    const stargateEl = document.querySelector<HTMLElement>('.section-journey-teaser');
    if (stargateEl) {
      const r = stargateEl.getBoundingClientRect();
      const vis = Math.max(0, Math.min(r.bottom, viewportH) - Math.max(r.top, 0));
      stargateProx = Math.min(1, vis / Math.max(r.height * 0.5, 1));
    }

    // Batch CSS var writes
    style.setProperty('--home-scroll-p', p.toFixed(3));
    style.setProperty('--home-scroll-vel', vel.toFixed(3));
    style.setProperty('--hero-depth', heroDepth.toFixed(3));
    style.setProperty('--stargate-proximity', stargateProx.toFixed(3));
    chargeables.forEach((el, i) => {
      style.setProperty(`--solve-charge-${i}`, sampleCharge(el, viewportH).toFixed(3));
    });

    // HUD updates (DOM writes batched after CSS var batch)
    if (hud) {
      hud.querySelectorAll<HTMLElement>('.sector-item').forEach(item => {
        item.classList.toggle('is-active', item.dataset.sectorId === most.id);
      });
    }
    if (mobileLabel) mobileLabel.textContent = most.id.toUpperCase();
    document.querySelectorAll<HTMLElement>('.mobile-dot').forEach(dot => {
      dot.classList.toggle('is-active', dot.dataset.sectorId === most.id);
    });
    const pct = Math.round(p * 100);
    if (pctEl) pctEl.textContent = pct + '%';
    if (fillEl) fillEl.style.height = pct + '%';
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(tick);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  tick();

  return () => {
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onScroll);
  };
}
