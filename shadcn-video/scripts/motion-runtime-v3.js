/**
 * Mode2 Motion Runtime v3
 * Deterministic, seekTo-friendly helpers for frame-by-frame capture.
 */
(function () {
  "use strict";

  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const mix = (from, to, progress) => from + (to - from) * progress;
  const ease = {
    linear: (t) => t,
    outCubic: (t) => 1 - Math.pow(1 - t, 3),
    outQuart: (t) => 1 - Math.pow(1 - t, 4),
    inOutCubic: (t) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    outBack: (t) => {
      const c1 = 1.35;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },
  };

  const progress = (time, start, duration, easing = "outCubic") => {
    const raw = clamp((time - start) / Math.max(duration, 0.0001));
    return (ease[easing] || ease.outCubic)(raw);
  };

  const elements = (target) => {
    if (typeof target === "string") return Array.from(document.querySelectorAll(target));
    if (target instanceof Element) return [target];
    return Array.from(target || []);
  };

  const set = (target, styles) => {
    elements(target).forEach((element) => {
      Object.entries(styles).forEach(([property, value]) => {
        if (value !== undefined && value !== null) element.style[property] = String(value);
      });
    });
  };

  const reveal = (target, time, options = {}) => {
    const {
      start = 0,
      duration = 0.65,
      x = 0,
      y = 42,
      scale = 0.96,
      blur = 14,
      easing = "outQuart",
    } = options;
    const p = progress(time, start, duration, easing);
    set(target, {
      opacity: p,
      transform: `translate3d(${mix(x, 0, p)}px, ${mix(y, 0, p)}px, 0) scale(${mix(scale, 1, p)})`,
      filter: `blur(${mix(blur, 0, p)}px)`,
    });
    return p;
  };

  const stagger = (target, time, options = {}) => {
    const { start = 0, each = 0.11, ...revealOptions } = options;
    elements(target).forEach((element, index) => {
      reveal(element, time, { ...revealOptions, start: start + index * each });
    });
  };

  const typewriter = (target, text, time, options = {}) => {
    const { start = 0, duration = 1.2, cursor = true } = options;
    const p = progress(time, start, duration, "linear");
    const count = Math.floor(text.length * p);
    const element = elements(target)[0];
    if (!element) return;
    const cursorVisible = cursor && p < 1 && Math.floor((time - start) * 4) % 2 === 0;
    element.textContent = text.slice(0, count) + (cursorVisible ? "|" : "");
  };

  const counter = (target, from, to, time, options = {}) => {
    const { start = 0, duration = 1, suffix = "", formatter } = options;
    const p = progress(time, start, duration, "outQuart");
    const value = mix(from, to, p);
    const element = elements(target)[0];
    if (element) {
      element.textContent = formatter ? formatter(value) : `${Math.round(value)}${suffix}`;
    }
  };

  const bar = (target, time, options = {}) => {
    const { start = 0, duration = 0.8, value = 1, axis = "x" } = options;
    const p = progress(time, start, duration, "outQuart") * value;
    set(target, {
      transform: axis === "y" ? `scaleY(${p})` : `scaleX(${p})`,
      transformOrigin: axis === "y" ? "bottom" : "left",
    });
  };

  const drawPath = (target, time, options = {}) => {
    const { start = 0, duration = 1, reverse = false } = options;
    elements(target).forEach((path) => {
      const length = path.getTotalLength();
      const p = progress(time, start, duration, "inOutCubic");
      path.style.strokeDasharray = `${length}`;
      path.style.strokeDashoffset = `${reverse ? -length * (1 - p) : length * (1 - p)}`;
      path.style.opacity = String(clamp(p * 2));
    });
  };

  const camera = (target, time, options = {}) => {
    const {
      start = 0,
      duration = 4,
      fromScale = 1,
      toScale = 1.035,
      fromX = 0,
      toX = 0,
      fromY = 0,
      toY = 0,
    } = options;
    const p = progress(time, start, duration, "inOutCubic");
    set(target, {
      transform: `translate3d(${mix(fromX, toX, p)}px, ${mix(fromY, toY, p)}px, 0) scale(${mix(fromScale, toScale, p)})`,
    });
  };

  const float = (target, time, options = {}) => {
    const { amplitude = 10, speed = 0.55, phase = 0, axis = "y" } = options;
    const offset = Math.sin((time * speed + phase) * Math.PI * 2) * amplitude;
    set(target, {
      transform: axis === "x" ? `translate3d(${offset}px,0,0)` : `translate3d(0,${offset}px,0)`,
    });
  };

  const pulse = (target, time, options = {}) => {
    const { min = 0.35, max = 0.9, speed = 0.5, phase = 0 } = options;
    const wave = (Math.sin((time * speed + phase) * Math.PI * 2) + 1) / 2;
    set(target, { opacity: mix(min, max, wave) });
  };

  const phase = (time, start, end, fade = 0.35) => {
    const fadeIn = progress(time, start, fade, "outCubic");
    const fadeOut = 1 - progress(time, end - fade, fade, "outCubic");
    return clamp(Math.min(fadeIn, fadeOut));
  };

  const showPhase = (target, time, options = {}) => {
    const { start = 0, end = 1, fade = 0.35 } = options;
    const opacity = phase(time, start, end, fade);
    set(target, {
      opacity,
      pointerEvents: opacity > 0.5 ? "auto" : "none",
      visibility: opacity > 0.001 ? "visible" : "hidden",
    });
    return opacity;
  };

  const createDirector = ({ duration, render }) => {
    let currentTime = 0;
    const seekTo = (seconds) => {
      currentTime = clamp(Number(seconds) || 0, 0, duration);
      render(currentTime);
      document.documentElement.dataset.mode2Time = currentTime.toFixed(4);
      return currentTime;
    };
    window.seekTo = seekTo;
    window.__mode2Duration = duration;
    window.__mode2Ready = true;
    seekTo(0);
    return { seekTo, get time() { return currentTime; } };
  };

  window.Mode2Motion = {
    clamp,
    mix,
    ease,
    progress,
    set,
    reveal,
    stagger,
    typewriter,
    counter,
    bar,
    drawPath,
    camera,
    float,
    pulse,
    phase,
    showPhase,
    createDirector,
  };
})();
