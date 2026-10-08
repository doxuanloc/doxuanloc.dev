let dispose: (() => void) | undefined;

export function initPortfolioMotion() {
  dispose?.();
  const page = document.querySelector<HTMLElement>('.hero-editorial');
  if (!page) return;
  const controller = new AbortController();
  const { signal } = controller;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  const root = document.documentElement;
  const scene = page.querySelector<HTMLElement>('[data-scene]');
  const stage = scene?.querySelector<HTMLElement>('.scene-stage');
  const camera = scene?.querySelector<HTMLElement>('.scene-camera');
  const pause = scene?.querySelector<HTMLButtonElement>('[data-motion-toggle]');
  const rotatingCore = scene?.querySelector<HTMLElement>('.core-rotor');
  const pendingFrames = new Set<number>();
  const observers: IntersectionObserver[] = [];
  const cleanStyles: HTMLElement[] = [];
  let paused = reduced.matches;
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let dragX = 0;
  let dragY = 0;
  let originX = 0;
  let originY = 0;
  let activePointer: number | null = null;
  let sceneFrame = 0;
  let nextLookX = 0;
  let nextLookY = 0;
  function frame(callback: () => void) {
    const id = requestAnimationFrame(() => { pendingFrames.delete(id); callback(); });
    pendingFrames.add(id);
    return id;
  }
  function applyPause() {
    root.dataset.motion = paused ? 'paused' : 'running';
    pause?.setAttribute('aria-pressed', String(paused));
    pause?.setAttribute('aria-label', (paused ? pause.dataset.playLabel : pause.dataset.pauseLabel) ?? 'Pause motion');
    const icon = pause?.querySelector('.pause-icon');
    if (icon) icon.textContent = paused ? '▷' : 'Ⅱ';
    if (paused) cleanStyles.forEach(element => {
      element.style.removeProperty('--tilt-x'); element.style.removeProperty('--tilt-y');
      element.style.removeProperty('--look-x'); element.style.removeProperty('--look-y');
      element.style.removeProperty('--mag-x'); element.style.removeProperty('--mag-y');
    });
    if (paused) {
      dragging = false;
      if (stage && activePointer !== null && stage.hasPointerCapture(activePointer)) stage.releasePointerCapture(activePointer);
      activePointer = null;
      rotatingCore?.style.removeProperty('animation-play-state');
      stage?.classList.remove('is-dragging');
    }
  }
  applyPause();
  if (pause) {
    pause.hidden = reduced.matches;
    pause.addEventListener('click', () => { paused = !paused; applyPause(); }, { signal });
  }
  reduced.addEventListener('change', () => initPortfolioMotion(), { signal });

  if (!reduced.matches) {
    root.classList.add('motion-enhanced');
    const reveal = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const element = entry.target as HTMLElement;
        element.classList.add('has-entered');
        reveal.unobserve(element);
      });
    }, { threshold: .08 });
    observers.push(reveal);
    document.querySelectorAll<HTMLElement>('.work-card, .experience-intro, .career-row, .focus-card, .writing-card, .contact-layout, .section-heading').forEach((element, index) => {
      element.classList.add('motion-reveal');
      element.style.setProperty('--entry-delay', `${(index % 3) * 65}ms`);
      const rect = element.getBoundingClientRect();
      if (rect.top < innerHeight) element.classList.add('has-entered');
      else reveal.observe(element);
    });
    const projectVisibility = new IntersectionObserver(entries => {
      entries.forEach(entry => (entry.target as HTMLElement).dataset.motionVisible = String(entry.isIntersecting));
    }, { rootMargin: '100px' });
    document.querySelectorAll('.system-art, .xem-preview').forEach(element => projectVisibility.observe(element));
    observers.push(projectVisibility);
  }

  if (scene && stage && camera) {
    cleanStyles.push(camera);
    const visibility = new IntersectionObserver(entries => {
      scene.dataset.running = entries[0].isIntersecting && !document.hidden ? 'true' : 'false';
    }, { threshold: .05 });
    visibility.observe(scene); observers.push(visibility);
    document.addEventListener('visibilitychange', () => {
      const box = scene.getBoundingClientRect();
      scene.dataset.running = !document.hidden && box.bottom > 0 && box.top < innerHeight ? 'true' : 'false';
    }, { signal });
    function updateCamera(x: number, y: number) {
      nextLookX = x; nextLookY = y;
      if (sceneFrame) return;
      sceneFrame = frame(() => {
        if (!paused) {
          camera!.style.setProperty('--look-x', String(nextLookX));
          camera!.style.setProperty('--look-y', String(nextLookY));
        }
        sceneFrame = 0;
      });
    }
    stage.addEventListener('pointermove', event => {
      if (paused) return;
      if (dragging) {
        dragX = originX + (event.clientX - startX) / 70;
        dragY = Math.max(-2, Math.min(2, originY + (event.clientY - startY) / 100));
        updateCamera(dragX, dragY);
      } else if (fine.matches) {
        const box = stage.getBoundingClientRect();
        updateCamera(dragX + (event.clientX - box.left) / box.width * 2 - 1, dragY + (event.clientY - box.top) / box.height * 2 - 1);
      }
    }, { signal });
    stage.addEventListener('pointerdown', event => {
      if (paused || event.button !== 0 || event.target instanceof HTMLButtonElement) return;
      dragging = true; startX = event.clientX; startY = event.clientY;
      activePointer = event.pointerId;
      originX = dragX; originY = dragY;
      stage.setPointerCapture(event.pointerId);
      rotatingCore?.style.setProperty('animation-play-state', 'paused');
      stage.classList.add('is-dragging');
    }, { signal });
    function endDrag() {
      dragging = false;
      if (activePointer !== null && stage!.hasPointerCapture(activePointer)) stage!.releasePointerCapture(activePointer);
      activePointer = null;
      rotatingCore?.style.removeProperty('animation-play-state');
      stage!.classList.remove('is-dragging');
    }
    stage.addEventListener('pointerup', endDrag, { signal });
    stage.addEventListener('pointercancel', endDrag, { signal });
    stage.addEventListener('lostpointercapture', endDrag, { signal });
    stage.addEventListener('pointerleave', () => { if (!dragging && !paused) updateCamera(dragX, dragY); }, { signal });
    let scrollScheduled = false;
    const updateScroll = () => {
      if (scrollScheduled || paused || reduced.matches) return;
      scrollScheduled = true;
      frame(() => {
        const box = page.getBoundingClientRect();
        if (!paused && box.bottom > 0) scene.style.setProperty('--scroll-depth', String(Math.max(0, Math.min(1, -box.top / box.height))));
        scrollScheduled = false;
      });
    };
    window.addEventListener('scroll', updateScroll, { signal, passive: true });
  }

  if (fine.matches && !reduced.matches) {
    document.querySelectorAll<HTMLElement>('.work-card').forEach(card => {
      cleanStyles.push(card);
      let scheduled = false;
      let pointerX = 0;
      let pointerY = 0;
      let box: DOMRect;
      card.addEventListener('pointerenter', () => { box = card.getBoundingClientRect(); }, { signal });
      card.addEventListener('pointermove', event => {
        if (paused || !box) return;
        pointerX = (event.clientX - box.left) / box.width;
        pointerY = (event.clientY - box.top) / box.height;
        if (scheduled) return;
        scheduled = true;
        frame(() => {
          if (!paused) {
            card.style.setProperty('--tilt-x', `${(pointerY - .5) * -5}deg`);
            card.style.setProperty('--tilt-y', `${(pointerX - .5) * 5}deg`);
            card.style.setProperty('--light-x', `${pointerX * 100}%`);
            card.style.setProperty('--light-y', `${pointerY * 100}%`);
          }
          scheduled = false;
        });
      }, { signal });
      card.addEventListener('pointerleave', () => { card.style.setProperty('--tilt-x', '0deg'); card.style.setProperty('--tilt-y', '0deg'); }, { signal });
    });
    document.querySelectorAll<HTMLElement>('.hero-actions .btn, .contact-section .btn').forEach(button => {
      cleanStyles.push(button);
      button.addEventListener('pointermove', event => {
        if (paused) return;
        const box = button.getBoundingClientRect();
        button.style.setProperty('--mag-x', `${(event.clientX - box.left - box.width / 2) * .08}px`);
        button.style.setProperty('--mag-y', `${(event.clientY - box.top - box.height / 2) * .14}px`);
      }, { signal });
      button.addEventListener('pointerleave', () => { button.style.setProperty('--mag-x', '0px'); button.style.setProperty('--mag-y', '0px'); }, { signal });
    });
  }

  dispose = () => {
    controller.abort(); observers.forEach(observer => observer.disconnect());
    pendingFrames.forEach(id => cancelAnimationFrame(id));
    if (stage && activePointer !== null && stage.hasPointerCapture(activePointer)) stage.releasePointerCapture(activePointer);
    rotatingCore?.style.removeProperty('animation-play-state');
    stage?.classList.remove('is-dragging');
    cleanStyles.forEach(element => {
      ['--look-x','--look-y','--tilt-x','--tilt-y','--mag-x','--mag-y'].forEach(property => element.style.removeProperty(property));
    });
    root.classList.remove('motion-enhanced');
    delete root.dataset.motion;
    document.querySelectorAll('.motion-reveal').forEach(element => element.classList.remove('motion-reveal'));
  };
}

document.addEventListener('astro:before-swap', () => dispose?.());
