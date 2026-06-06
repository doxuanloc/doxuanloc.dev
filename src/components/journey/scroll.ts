/**
 * Journey Timeline Scroll Controller
 * Handles scroll-based panel transitions and rail progress
 */

export function initJourneyScroll(): void {
  const root = document.querySelector<HTMLElement>("[data-journey]");
  if (!root) return;

  const isDesktop = window.matchMedia("(min-width: 900px)").matches;
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  const panels = Array.from(root.querySelectorAll<HTMLElement>(".panel"));
  const rails = Array.from(root.querySelectorAll<HTMLElement>(".rail-item"));
  const fill = root.querySelector<HTMLElement>("[data-rail-fill]");

  // Mobile progress elements
  const progressFill = root.querySelector<HTMLElement>("[data-progress-fill]");
  const progressCurrent = root.querySelector<HTMLElement>(
    "[data-progress-current]",
  );

  const n = panels.length;
  if (!n) return;

  // On mobile or reduced motion: show all panels (normal timeline) + track scroll for progress
  if (!isDesktop || reducedMotion) {
    panels.forEach((p) => p.classList.add("is-active"));

    // Setup mobile scroll tracking for progress indicator
    if (progressFill || progressCurrent) {
      let mobileTicking = false;

      function updateMobileProgress(): void {
        if (!root) return;

        const rect = root.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const rootTop = rect.top;
        const rootHeight = rect.height;

        // Calculate which panel is most visible
        let currentPanel = 0;
        let maxVisibility = 0;

        panels.forEach((panel, i) => {
          const panelRect = panel.getBoundingClientRect();
          const panelTop = panelRect.top;
          const panelBottom = panelRect.bottom;
          const panelHeight = panelRect.height;

          // Calculate how much of the panel is in viewport
          const visibleTop = Math.max(
            0,
            Math.min(panelBottom, viewportHeight) - Math.max(panelTop, 0),
          );
          const visibility = visibleTop / panelHeight;

          if (visibility > maxVisibility) {
            maxVisibility = visibility;
            currentPanel = i;
          }
        });

        // Calculate overall progress
        const scrollProgress = Math.max(
          0,
          Math.min(1, -rootTop / (rootHeight - viewportHeight)),
        );

        if (progressFill) {
          progressFill.style.width = `${scrollProgress * 100}%`;
        }

        if (progressCurrent) {
          progressCurrent.textContent = String(currentPanel + 1);
        }
      }

      function onMobileScroll(): void {
        if (mobileTicking) return;
        mobileTicking = true;
        requestAnimationFrame(() => {
          updateMobileProgress();
          mobileTicking = false;
        });
      }

      window.addEventListener("scroll", onMobileScroll, { passive: true });
      updateMobileProgress();
    }

    return;
  }

  // Desktop mode: pinned scrollytelling
  let activeIndex = -1;
  let ticking = false;

  function setActive(index: number, progress: number): void {
    // Update rail progress fill
    if (fill) {
      fill.style.height = `${Math.max(0, Math.min(1, progress)) * 100}%`;
    }

    // Skip if already active
    if (index === activeIndex) return;
    activeIndex = index;

    // Toggle panel visibility
    panels.forEach((el, k) => {
      el.classList.toggle("is-active", k === index);
    });

    // Toggle rail active state
    rails.forEach((el, k) => {
      el.classList.toggle("is-active", k === index);
    });
  }

  function onScroll(): void {
    if (ticking || !root) return;
    ticking = true;

    requestAnimationFrame(() => {
      if (!root) return;
      const rect = root.getBoundingClientRect();
      const total = root.offsetHeight - window.innerHeight;
      const scrolled = Math.min(Math.max(-rect.top, 0), total);
      const progress = total > 0 ? scrolled / total : 0;
      const index = Math.min(n - 1, Math.floor(progress * n));

      setActive(index, progress);
      ticking = false;
    });
  }

  function scrollToMilestone(index: number): void {
    if (!root) return;
    const total = root.offsetHeight - window.innerHeight;
    const targetY = root.offsetTop + ((index + 0.5) / n) * total;
    window.scrollTo({ top: targetY, behavior: "smooth" });
  }

  // Rail click handlers
  rails.forEach((btn, i) => {
    btn.addEventListener("click", () => scrollToMilestone(i));
  });

  // Scroll listener
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });

  // Initial state
  onScroll();
}

// Auto-init on Astro page load
if (typeof document !== "undefined") {
  document.addEventListener("astro:page-load", initJourneyScroll);
}
