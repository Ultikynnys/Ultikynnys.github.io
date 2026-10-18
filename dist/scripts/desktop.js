"use strict";
(() => {
  // scripts/dom.ts
  function element(id) {
    const node = document.getElementById(id);
    if (!node) throw new Error(`Required element #${id} was not found`);
    return node;
  }
  function setMaximizeGlyph(button, maximized) {
    button.setAttribute("aria-label", maximized ? "Restore window" : "Maximize window");
    const glyph = button.querySelector("span");
    if (glyph) glyph.className = maximized ? "xp-glyph-restore" : "xp-glyph-max";
  }

  // scripts/icons.ts
  var ICONS = {
    computer: "images/xp-icons/computer.png",
    folder: "images/xp-icons/folder.png",
    pictures: "images/xp-icons/pictures.png",
    game: "images/xp-icons/game.png",
    document: "images/xp-icons/document.png",
    mail: "images/xp-icons/mail.png",
    messenger: "images/xp-icons/messenger.png",
    contacts: "images/xp-icons/contacts.png",
    web: "images/xp-icons/web.png",
    flag: "images/xp/flag.png"
  };
  function icon(name, size = 16) {
    return `<img class="xp-icon" src="${ICONS[name]}" width="${size}" height="${size}" alt="">`;
  }

  // scripts/util.ts
  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), Math.max(min, max));
  }
  async function fetchText(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.text();
  }
  function parseToml(text) {
    const result = {};
    let current = "";
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      const section = line.match(/^\[([^\]]+)\]$/);
      if (section) {
        current = section[1];
        if (!result[current]) result[current] = {};
        continue;
      }
      const pair = line.match(/^(\w+)\s*=\s*(.+)$/);
      if (pair && current) result[current][pair[1]] = parseTomlValue(pair[2]);
    }
    return result;
  }
  function parseTomlValue(raw) {
    if (raw.startsWith("[")) return raw.slice(1, -1).split(",").map((part) => part.trim().replace(/"/g, ""));
    if (raw === "true") return true;
    if (raw === "false") return false;
    return raw.replace(/^"|"$/g, "");
  }

  // scripts/social-ribbon.ts
  function parseContactsToml(text) {
    const config = { profile: {}, social: {}, ribbon: { order: [] } };
    for (const [section, values] of Object.entries(parseToml(text))) {
      if (section === "profile") Object.assign(config.profile, values);
      else if (section === "ribbon") {
        const order = values.order;
        if (Array.isArray(order)) config.ribbon.order = order;
      } else if (section.startsWith("social.")) config.social[section.slice("social.".length)] = values;
    }
    return config;
  }
  var SOCIAL_ICONS = {
    discord: "messenger",
    artstation: "pictures",
    cv: "document",
    email: "mail",
    linkedin: "contacts",
    github: "web",
    twitter: "web"
  };
  function buildContactLink(key, social, size, extraClass) {
    const link = document.createElement("a");
    link.href = String(social.url);
    link.className = [String(social.class ?? ""), extraClass].filter(Boolean).join(" ");
    if (social.external !== false) {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }
    const brand = typeof social.icon === "string" ? social.icon : "";
    const svgIcon = typeof social.iconSvg === "string" ? social.iconSvg : "";
    link.innerHTML = brand ? `<i class="xp-fav-icon ${brand}" aria-hidden="true"></i>` : svgIcon ? `<img class="xp-fav-icon" src="${svgIcon}" width="${size}" height="${size}" alt="">` : icon(SOCIAL_ICONS[key] ?? "web", size);
    link.append(document.createTextNode(` ${String(social.label ?? key)}`));
    return link;
  }
  async function loadSocialRibbon() {
    try {
      const config = parseContactsToml(await fetchText("config/contacts.toml"));
      const favourites = document.createElement("nav");
      favourites.className = "xp-favourites";
      favourites.setAttribute("aria-label", "Favourite links");
      const side = document.querySelector("#xp-start-menu .xp-menu-side");
      for (const key of config.ribbon.order) {
        const social = config.social[key];
        if (!social || typeof social.url !== "string") continue;
        favourites.append(buildContactLink(key, social, 32, ""));
        if (side) side.append(buildContactLink(key, social, 16, "xp-menu-side-link"));
      }
      const shortcuts = document.getElementById("xp-shortcuts");
      if (shortcuts) shortcuts.after(favourites);
      else document.body.append(favourites);
    } catch (error) {
      console.warn("Contacts unavailable", error);
    }
  }

  // scripts/desktop.ts
  var XP_SOUNDS = { start: "audio/xp-start.ogg", minimize: "audio/xp-minimize.ogg", restore: "audio/xp-restore.ogg", startup: "audio/xp-startup.ogg" };
  var soundCache = /* @__PURE__ */ new Map();
  function getClip(name) {
    try {
      let clip = soundCache.get(name);
      if (!clip) {
        clip = new Audio(XP_SOUNDS[name]);
        clip.preload = "auto";
        soundCache.set(name, clip);
      }
      return clip;
    } catch {
      return null;
    }
  }
  function playSound(name) {
    const clip = getClip(name);
    if (!clip) return null;
    try {
      clip.volume = window.xpVolume?.() ?? 1;
      clip.currentTime = 0;
      void clip.play().catch(() => {
      });
    } catch {
    }
    return clip;
  }
  function navigateAfterClick(href) {
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      location.assign(href);
    };
    const clip = playSound("start");
    if (!clip) {
      go();
      return;
    }
    clip.addEventListener("ended", go, { once: true });
    window.setTimeout(go, 700);
  }
  getClip("start");
  async function playStartup() {
    const clip = getClip("startup");
    if (!clip) return;
    clip.volume = (window.xpVolume?.() ?? 1) * 0.35;
    clip.currentTime = 0;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await clip.play();
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError" && attempt === 0) continue;
        console.warn("Startup audio could not autoplay:", error);
        return;
      }
    }
  }
  var CV_DESTINATION = { title: "My CV", href: "cv_template.html", icon: "document", detail: "Experience & skills", shortcut: false };
  var destinations = [
    { title: "My Portfolio", href: "index.html", icon: "computer", detail: "Welcome to my portfolio" },
    { title: "Programming", href: "programming-portfolio.html", icon: "folder", detail: "Software & engineering" },
    { title: "3D Art", href: "3d-portfolio.html", icon: "pictures", detail: "Models & environments" },
    { title: "Game Development", href: "gamedev-portfolio.html", icon: "game", detail: "Games & interactive worlds" },
    CV_DESTINATION
  ];
  function destinationLink(item, size, withDetail = false) {
    return `<a href="${item.href}">${icon(item.icon, size)}<span>${withDetail ? `<strong>${item.title}</strong><small>${item.detail}</small>` : item.title}</span></a>`;
  }
  var HOME = destinations[0].href;
  var DESKTOP = { top: 26, left: 124, right: 138, bottom: 30 };
  var MIN_SIZE = { width: 340, height: 240 };
  var EDGE = 8;
  var XP_CURSOR_HOTSPOTS = {
    arrow: { x: 5, y: 6 },
    pointer: { x: 11, y: 5 },
    text: { x: 9, y: 15 },
    move: { x: 18, y: 18 },
    "resize-h": { x: 18, y: 18 },
    "resize-v": { x: 18, y: 21 },
    "resize-se": { x: 15, y: 15 },
    "resize-sw": { x: 15, y: 15 }
  };
  function xpCursorMode(target) {
    if (!(target instanceof Element)) return "arrow";
    if (target.closest(".xp-edge-w, .xp-edge-e")) return "resize-h";
    if (target.closest(".xp-edge-s")) return "resize-v";
    if (target.closest(".xp-edge-sw")) return "resize-sw";
    if (target.closest(".xp-resize")) return "resize-se";
    if (document.body.classList.contains("xp-dragging")) return "move";
    if (target.closest(".xp-tb:disabled")) return "arrow";
    if (target.closest('a, button, summary, label, select, [role="button"], [data-action], .project-card, .portfolio-choice, .xp-task, .xp-start, .xp-tb, .xp-volume, input[type="checkbox"], input[type="radio"], input[type="range"], input[type="button"], input[type="submit"]')) return "pointer";
    if (target.closest('.selectable, .selectable *, [data-selectable], [data-selectable] *, textarea, input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="button"]):not([type="submit"]), [contenteditable="true"], [contenteditable="true"] *')) return "text";
    return "arrow";
  }
  function isOverScrollbar(x, y) {
    let node = document.elementFromPoint(x, y);
    while (node) {
      const rect = node.getBoundingClientRect();
      if (node.scrollHeight - node.clientHeight > 1 && x >= rect.left + node.clientWidth && x <= rect.right && y >= rect.top && y <= rect.bottom) return true;
      if (node.scrollWidth - node.clientWidth > 1 && y >= rect.top + node.clientHeight && y <= rect.bottom && x >= rect.left && x <= rect.right) return true;
      node = node.parentElement;
    }
    return false;
  }
  function isInSiteNavigation() {
    try {
      return document.referrer !== "" && new URL(document.referrer).origin === location.origin;
    } catch {
      return false;
    }
  }
  function showBoot(force = false) {
    const nav = performance.getEntriesByType("navigation")[0];
    const reloaded = nav?.type === "reload";
    if (!force) {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      if (!reloaded) {
        try {
          if (sessionStorage.getItem("xp-booted")) return;
        } catch {
        }
        if (nav?.type === "back_forward" || isInSiteNavigation()) return;
      }
    }
    const screen = document.createElement("div");
    screen.className = "xp-boot";
    screen.setAttribute("role", "dialog");
    screen.setAttribute("aria-modal", "true");
    screen.setAttribute("aria-label", "Portfolio startup");
    const bootTrack = "images/xp/progress-track.png";
    const bootBlock = "images/xp/progress-block.png";
    screen.innerHTML = `<svg width="0" height="0" aria-hidden="true" style="position:absolute"><filter id="xp-boot-aa" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 30 -15"/></filter></svg><div class="xp-boot-brand"><div class="xp-boot-lockup"><img class="xp-boot-flag" src="${ICONS.flag}" width="140" height="100" alt=""><p class="xp-boot-user">Ubeid Hussein</p><h1>Portfolio<span>xp</span></h1></div><div class="xp-boot-progress" role="status" aria-label="Starting portfolio"><img class="xp-boot-track" src="${bootTrack}" alt=""><div class="xp-boot-clip"><div class="xp-boot-blocks"><img src="${bootBlock}" alt=""><img src="${bootBlock}" alt=""><img src="${bootBlock}" alt=""></div></div></div></div><p class="xp-boot-copyright">Copyright \xA9 2026 Ubeid Hussein</p>`;
    document.body.append(screen);
    const shell = element("xp-shell");
    shell.inert = true;
    const taskbar = element("xp-taskbar");
    taskbar.inert = true;
    const shortcuts = element("xp-shortcuts");
    shortcuts.inert = true;
    const previousFocus = document.activeElement;
    let timer = 0;
    let dismissed = false;
    const dismiss = () => {
      if (dismissed) return;
      dismissed = true;
      clearTimeout(timer);
      document.removeEventListener("keydown", onKey);
      screen.remove();
      shell.inert = false;
      taskbar.inert = false;
      shortcuts.inert = false;
      try {
        sessionStorage.setItem("xp-booted", "1");
      } catch {
      }
      if (previousFocus instanceof HTMLElement && previousFocus !== document.body) previousFocus.focus();
      else element("xp-start").focus({ preventScroll: true });
      void playStartup();
    };
    const onKey = (event) => {
      if (event.key === "Escape" || event.key === "Enter") {
        event.preventDefault();
        dismiss();
      }
    };
    document.addEventListener("keydown", onKey);
    screen.tabIndex = -1;
    screen.focus();
    timer = window.setTimeout(dismiss, 2600);
  }
  window.addEventListener("pageshow", (event) => {
    if (!event.persisted) return;
    const stale = document.querySelector(".xp-boot");
    if (!stale) return;
    stale.remove();
    for (const id of ["xp-shell", "xp-taskbar", "xp-shortcuts"]) {
      const el = document.getElementById(id);
      if (el) el.inert = false;
    }
  });
  function initDesktop() {
    document.body.classList.add("xp-desktop");
    for (const [key, value] of Object.entries(DESKTOP)) document.body.style.setProperty(`--desk-${key}`, `${value}px`);
    const viewportW = () => document.documentElement.clientWidth;
    const viewportH = () => document.documentElement.clientHeight;
    const file = location.pathname.split("/").pop() || "index.html";
    const current = destinations.find((item) => item.href === file) ?? destinations[0];
    const shell = document.createElement("section");
    shell.id = "xp-shell";
    shell.className = "xp-window";
    shell.tabIndex = -1;
    shell.setAttribute("aria-label", current.title);
    const titlebar = document.createElement("div");
    titlebar.className = "xp-titlebar";
    titlebar.innerHTML = `${icon(current.icon, 16)}<span class="xp-title">${current.title} - Ubeid Hussein</span><div class="xp-window-controls"><button id="xp-minimize" aria-label="Minimize window"><span class="xp-glyph-min"></span></button><button id="xp-maximize" aria-label="Maximize window" aria-pressed="false"><span class="xp-glyph-max"></span></button><button id="xp-close" aria-label="Close window" class="xp-close"><span class="xp-glyph-close"></span></button></div>`;
    const address = document.createElement("div");
    address.className = "xp-address";
    address.innerHTML = `<span>Address</span><span class="xp-address-field">${icon(current.icon, 16)} ${current.title}</span>`;
    const toolbar = document.createElement("div");
    toolbar.className = "xp-toolbar";
    toolbar.innerHTML = `<button id="xp-up" class="xp-tb" type="button"><span class="xp-up-icon">${icon("folder", 16)}<svg class="xp-up-arrow" viewBox="0 0 10 10" width="9" height="9" aria-hidden="true"><path d="M5 0.5 L9.5 5 L6.8 5 L6.8 9.5 L3.2 9.5 L3.2 5 L0.5 5 Z" fill="#3aa04a" stroke="#1c5f27" stroke-width="0.7"/></svg></span>Up</button>`;
    const content = document.createElement("div");
    content.className = "xp-content";
    for (const node of [...document.body.childNodes]) {
      if (node instanceof HTMLScriptElement) continue;
      content.append(node);
    }
    const status = document.createElement("div");
    status.className = "xp-statusbar";
    status.innerHTML = `<span>${current.detail}</span>`;
    const grip = document.createElement("div");
    grip.className = "xp-resize";
    grip.setAttribute("aria-hidden", "true");
    const edge = (dir) => {
      const el = document.createElement("div");
      el.className = `xp-edge xp-edge-${dir}`;
      el.setAttribute("aria-hidden", "true");
      return el;
    };
    const edges = { w: edge("w"), e: edge("e"), s: edge("s"), sw: edge("sw") };
    shell.append(titlebar, toolbar, address, content, status, grip, edges.w, edges.e, edges.s, edges.sw);
    const shortcuts = document.createElement("nav");
    shortcuts.id = "xp-shortcuts";
    shortcuts.className = "xp-shortcuts";
    shortcuts.setAttribute("aria-label", "Desktop shortcuts");
    shortcuts.innerHTML = destinations.filter((item) => item.shortcut !== false).map((item) => destinationLink(item, 32)).join("");
    const taskbar = document.createElement("div");
    taskbar.id = "xp-taskbar";
    taskbar.className = "xp-taskbar";
    const trayVolume = '<button id="xp-volume" class="xp-volume" type="button" aria-label="Volume" aria-haspopup="true" aria-expanded="false" aria-controls="xp-volume-panel"><img id="xp-volume-icon" src="images/xp/volume.png" width="16" height="16" alt=""></button>';
    taskbar.innerHTML = `<button id="xp-start" class="xp-start" aria-expanded="false" aria-controls="xp-start-menu"><img class="xp-start-flag" src="images/xp/start-flag.png" width="23" height="19" alt="">start</button><button id="xp-task" class="xp-task" aria-expanded="true">${icon(current.icon, 16)}<span>${current.title}</span></button><div class="xp-tray">${trayVolume}<time id="xp-clock"></time></div>`;
    const menu = document.createElement("nav");
    menu.id = "xp-start-menu";
    menu.className = "xp-start-menu";
    menu.hidden = true;
    menu.setAttribute("aria-label", "Start navigation");
    menu.innerHTML = `<a class="xp-user" href="${CV_DESTINATION.href}"><img src="images/Profile.webp" alt=""><span>Ubeid Hussein</span></a><div class="xp-menu-body"><div class="xp-menu-apps">${destinations.map((item) => destinationLink(item, 24, true)).join("")}</div><div class="xp-menu-side"></div></div><div class="xp-menu-footer"><span>Making cool shit since 1999</span><button class="xp-menu-power" id="xp-reboot"><img class="xp-menu-power-icon" src="images/xp/restart.png" width="24" height="24" alt="">Restart</button></div>`;
    document.body.append(shortcuts, shell, taskbar, menu);
    if (window.matchMedia("(pointer:fine)").matches) {
      const cursorElement = document.createElement("img");
      cursorElement.id = "xp-cursor";
      cursorElement.alt = "";
      cursorElement.setAttribute("aria-hidden", "true");
      cursorElement.draggable = false;
      document.body.append(cursorElement);
      const cursorSources = {
        arrow: "images/xp-cursors/arrow.svg",
        pointer: "images/xp-cursors/pointer.svg",
        text: "images/xp-cursors/text.svg",
        move: "images/xp-cursors/move.svg",
        "resize-h": "images/xp-cursors/resize-h.svg",
        "resize-v": "images/xp-cursors/resize-v.svg",
        "resize-se": "images/xp-cursors/resize-se.svg",
        "resize-sw": "images/xp-cursors/resize-sw.svg"
      };
      const preloads = Object.values(cursorSources).map((src) => {
        const image = new Image();
        image.src = src;
        return image;
      });
      let lastPointerEvent = null;
      let cursorAssetsReady = false;
      let activeMode = "arrow";
      const hideCustomCursor = () => {
        cursorElement.classList.remove("xp-cursor-visible");
        document.documentElement.classList.remove("xp-custom-cursor");
        document.body.classList.remove("xp-custom-cursor");
      };
      cursorElement.src = cursorSources[activeMode];
      const updateCursor = (event, target = event.target) => {
        lastPointerEvent = event;
        if (event.pointerType !== "mouse" && event.pointerType !== "pen") {
          hideCustomCursor();
          return;
        }
        const mode = xpCursorMode(target);
        if (mode !== activeMode) {
          activeMode = mode;
          cursorElement.src = cursorSources[mode];
        }
        const hotspot = XP_CURSOR_HOTSPOTS[mode];
        cursorElement.style.transform = `translate3d(${event.clientX - hotspot.x}px, ${event.clientY - hotspot.y}px, 0)`;
        if (!cursorAssetsReady) return;
        document.documentElement.classList.add("xp-custom-cursor");
        document.body.classList.add("xp-custom-cursor");
        cursorElement.classList.add("xp-cursor-visible");
      };
      const refreshCursorAfterPointerChange = (event) => {
        window.requestAnimationFrame(() => updateCursor(event, document.elementFromPoint(event.clientX, event.clientY)));
      };
      void Promise.all(preloads.map((image) => image.decode().catch(() => void 0))).then(() => {
        cursorAssetsReady = preloads.every((image) => image.naturalWidth > 0);
        if (cursorAssetsReady && lastPointerEvent) updateCursor(lastPointerEvent);
      });
      document.addEventListener("pointermove", updateCursor, true);
      document.addEventListener("pointerover", updateCursor, true);
      document.addEventListener("pointerdown", (event) => {
        updateCursor(event);
        refreshCursorAfterPointerChange(event);
      }, true);
      document.addEventListener("pointerup", refreshCursorAfterPointerChange, true);
      document.addEventListener("pointercancel", refreshCursorAfterPointerChange, true);
      document.addEventListener("pointerout", (event) => {
        if ((event.pointerType === "mouse" || event.pointerType === "pen") && !event.relatedTarget) hideCustomCursor();
      }, true);
      window.addEventListener("blur", hideCustomCursor);
      window.addEventListener("focus", () => {
        if (lastPointerEvent) updateCursor(lastPointerEvent, document.elementFromPoint(lastPointerEvent.clientX, lastPointerEvent.clientY));
      });
      const refreshFromLastPointer = () => {
        if (lastPointerEvent) updateCursor(lastPointerEvent, document.elementFromPoint(lastPointerEvent.clientX, lastPointerEvent.clientY));
      };
      const onScroll = () => {
        if (!lastPointerEvent) return;
        if (isOverScrollbar(lastPointerEvent.clientX, lastPointerEvent.clientY)) {
          hideCustomCursor();
          return;
        }
        refreshFromLastPointer();
      };
      document.addEventListener("scroll", onScroll, { capture: true, passive: true });
      window.addEventListener("resize", refreshFromLastPointer);
    }
    const applyRect = (rect) => {
      shell.style.left = `${rect.x}px`;
      shell.style.top = `${rect.y}px`;
      shell.style.width = `${rect.w}px`;
      shell.style.height = `${rect.h}px`;
    };
    const readRect = () => {
      const box = shell.getBoundingClientRect();
      return { x: box.left, y: box.top, w: box.width, h: box.height };
    };
    const defaultRect = () => {
      const availableW = Math.max(MIN_SIZE.width, viewportW() - DESKTOP.left - DESKTOP.right);
      const availableH = Math.max(MIN_SIZE.height, viewportH() - DESKTOP.top - DESKTOP.bottom);
      const w = Math.min(1e3, Math.round(availableW));
      const h = Math.min(660, Math.round(availableH));
      return { x: DESKTOP.left + Math.round((availableW - w) / 2), y: DESKTOP.top + Math.round((availableH - h) / 2), w, h };
    };
    const moveTo = (x, y) => {
      shell.style.left = `${clamp(x, EDGE, viewportW() - shell.offsetWidth - EDGE)}px`;
      shell.style.top = `${clamp(y, EDGE, viewportH() - DESKTOP.bottom - shell.offsetHeight - EDGE)}px`;
    };
    const sizeTo = (w, h) => {
      shell.style.width = `${clamp(w, MIN_SIZE.width, viewportW() - shell.offsetLeft - EDGE)}px`;
      shell.style.height = `${clamp(h, MIN_SIZE.height, viewportH() - shell.offsetTop - DESKTOP.bottom - EDGE)}px`;
    };
    let floating = defaultRect();
    applyRect(floating);
    let persistWindow = () => {
    };
    const maximizeButton = element("xp-maximize");
    const setMaximized = (maximized, silent = false) => {
      if (!silent) playSound("restore");
      if (maximized) floating = readRect();
      shell.classList.toggle("xp-maximized", maximized);
      if (maximized) {
        shell.style.left = "";
        shell.style.top = "";
        shell.style.width = "";
        shell.style.height = "";
      } else applyRect(floating);
      maximizeButton.setAttribute("aria-pressed", String(maximized));
      setMaximizeGlyph(maximizeButton, maximized);
      persistWindow();
    };
    maximizeButton.addEventListener("click", () => setMaximized(!shell.classList.contains("xp-maximized")));
    titlebar.addEventListener("dblclick", (event) => {
      if (!(event.target instanceof Element && event.target.closest(".xp-window-controls"))) setMaximized(!shell.classList.contains("xp-maximized"));
    });
    const task = element("xp-task");
    const minimize = (hidden, silent = false) => {
      if (!silent) playSound(hidden ? "minimize" : "restore");
      shell.hidden = hidden;
      task.setAttribute("aria-expanded", String(!hidden));
      if (hidden) task.focus();
      else shell.focus({ preventScroll: true });
      persistWindow();
    };
    element("xp-minimize").addEventListener("click", () => minimize(true));
    task.addEventListener("click", () => minimize(!shell.hidden));
    let drag = null;
    titlebar.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || event.target instanceof Element && event.target.closest(".xp-window-controls")) return;
      if (shell.classList.contains("xp-maximized")) {
        const ratio = (event.clientX - DESKTOP.left) / Math.max(1, viewportW() - DESKTOP.left - DESKTOP.right);
        setMaximized(false);
        floating = { ...floating, x: Math.round(event.clientX - floating.w * ratio), y: Math.round(event.clientY - 16) };
        applyRect(floating);
      }
      drag = { pointerId: event.pointerId, offsetX: event.clientX - shell.offsetLeft, offsetY: event.clientY - shell.offsetTop };
      titlebar.setPointerCapture(event.pointerId);
      document.body.classList.add("xp-dragging");
    });
    titlebar.addEventListener("pointermove", (event) => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      moveTo(event.clientX - drag.offsetX, event.clientY - drag.offsetY);
    });
    const endDrag = (event) => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      drag = null;
      floating = readRect();
      document.body.classList.remove("xp-dragging");
      persistWindow();
    };
    titlebar.addEventListener("pointerup", endDrag);
    titlebar.addEventListener("pointercancel", endDrag);
    let sizing = null;
    const resizeTo = (dir, dx, dy) => {
      if (!sizing) return;
      const right = sizing.x + sizing.w, bottom = sizing.y + sizing.h;
      let x = sizing.x, y = sizing.y, w = sizing.w, h = sizing.h;
      if (dir.includes("w")) {
        x = Math.max(EDGE, Math.min(sizing.x + dx, right - MIN_SIZE.width));
        w = right - x;
      } else if (dir.includes("e")) w = Math.max(MIN_SIZE.width, sizing.w + dx);
      if (dir.includes("s")) h = Math.max(MIN_SIZE.height, sizing.h + dy);
      w = Math.min(w, viewportW() - EDGE - x);
      h = Math.min(h, viewportH() - DESKTOP.bottom - EDGE - y);
      applyRect({ x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) });
    };
    const handles = [[edges.w, "w"], [edges.e, "e"], [edges.s, "s"], [edges.sw, "sw"], [grip, "se"]];
    for (const [handle, dir] of handles) {
      handle.addEventListener("pointerdown", (event) => {
        if (event.button !== 0 || shell.classList.contains("xp-maximized")) return;
        const rect = readRect();
        sizing = { pointerId: event.pointerId, dir, startX: event.clientX, startY: event.clientY, x: rect.x, y: rect.y, w: rect.w, h: rect.h };
        handle.setPointerCapture(event.pointerId);
        document.body.classList.add("xp-resizing");
      });
      handle.addEventListener("pointermove", (event) => {
        if (!sizing || event.pointerId !== sizing.pointerId) return;
        resizeTo(sizing.dir, event.clientX - sizing.startX, event.clientY - sizing.startY);
      });
      const endResize = (event) => {
        if (!sizing || event.pointerId !== sizing.pointerId) return;
        sizing = null;
        floating = readRect();
        document.body.classList.remove("xp-resizing");
        persistWindow();
      };
      handle.addEventListener("pointerup", endResize);
      handle.addEventListener("pointercancel", endResize);
    }
    window.addEventListener("resize", () => {
      if (shell.hidden || shell.classList.contains("xp-maximized")) return;
      const rect = readRect();
      sizeTo(rect.w, rect.h);
      moveTo(shell.offsetLeft, shell.offsetTop);
      floating = readRect();
      persistWindow();
    });
    const volumeButton = element("xp-volume");
    const volumePanel = document.createElement("div");
    volumePanel.id = "xp-volume-panel";
    volumePanel.className = "xp-volume-panel";
    volumePanel.hidden = true;
    volumePanel.setAttribute("role", "dialog");
    volumePanel.setAttribute("aria-label", "Volume");
    volumePanel.innerHTML = '<div class="xp-volume-title">Volume</div><input id="xp-volume-slider" class="xp-volume-slider" type="range" min="0" max="100" step="1" aria-label="Volume level"><label class="xp-volume-mute"><input id="xp-volume-mute" type="checkbox">Mute</label>';
    taskbar.append(volumePanel);
    const volumeSlider = element("xp-volume-slider");
    const volumeMute = element("xp-volume-mute");
    const readStored = (key, fallback) => {
      try {
        const raw = localStorage.getItem(key);
        if (raw === null) return fallback;
        const value = Number(raw);
        return Number.isFinite(value) ? value : fallback;
      } catch {
        return fallback;
      }
    };
    let volume = Math.min(100, Math.max(0, readStored("xp-volume", 70)));
    let muted = readStored("xp-muted", 0) === 1;
    const volumeLevel = () => muted ? 0 : volume / 100;
    const renderVolume = () => {
      volumeSlider.value = String(volume);
      volumeMute.checked = muted;
      element("xp-volume-icon").src = muted ? "images/xp/volume-mute.png" : "images/xp/volume.png";
    };
    const saveVolume = () => {
      try {
        localStorage.setItem("xp-volume", String(volume));
        localStorage.setItem("xp-muted", muted ? "1" : "0");
      } catch {
      }
    };
    const toggleVolume = (open) => {
      volumePanel.hidden = !open;
      volumeButton.setAttribute("aria-expanded", String(open));
      if (open) volumePanel.style.right = `${Math.max(6, window.innerWidth - volumeButton.getBoundingClientRect().right - 6)}px`;
    };
    volumeButton.addEventListener("click", () => toggleVolume(volumePanel.hidden));
    volumeSlider.addEventListener("input", () => {
      volume = Number(volumeSlider.value);
      saveVolume();
      renderVolume();
    });
    volumeMute.addEventListener("change", () => {
      muted = volumeMute.checked;
      saveVolume();
      renderVolume();
    });
    document.addEventListener("click", (event) => {
      if (event.target instanceof Node && !volumePanel.contains(event.target) && !volumeButton.contains(event.target)) toggleVolume(false);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !volumePanel.hidden) toggleVolume(false);
    });
    window.xpVolume = volumeLevel;
    renderVolume();
    const start = element("xp-start");
    const toggleMenu = (open) => {
      menu.hidden = !open;
      start.setAttribute("aria-expanded", String(open));
    };
    start.addEventListener("click", () => {
      const opening = menu.hidden;
      if (opening) playSound("start");
      toggleMenu(opening);
    });
    document.addEventListener("click", (event) => {
      if (event.target instanceof Node && !menu.contains(event.target) && !start.contains(event.target)) toggleMenu(false);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        toggleMenu(false);
        start.focus();
      }
    });
    element("xp-reboot").addEventListener("click", () => showBoot(true));
    const setWindowOpen = (open) => {
      shell.hidden = !open;
      task.hidden = !open;
      if (open) {
        task.setAttribute("aria-expanded", "true");
        shell.focus({ preventScroll: true });
      }
      persistWindow();
    };
    element("xp-close").addEventListener("click", () => setWindowOpen(false));
    const samePage = (href) => {
      if (!href) return false;
      try {
        const url = new URL(href, location.href);
        return url.origin === location.origin && (url.pathname.split("/").pop() || "index.html") === file;
      } catch {
        return false;
      }
    };
    document.addEventListener("click", (event) => {
      if (!(event.target instanceof Element)) return;
      const control = event.target.closest('a[href], button, [role="button"], summary, input, select, textarea, .project-card, .portfolio-choice');
      if (!control || control.closest("#xp-start, #xp-task, #xp-minimize, #xp-maximize")) return;
      const plain = !event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
      const link = control.closest("a[href]");
      const href = link?.getAttribute("href") ?? null;
      if (link && plain && href) {
        if (link.closest(".xp-shortcuts, .xp-favourites, #xp-start-menu") && samePage(href)) {
          event.preventDefault();
          playSound("start");
          toggleMenu(false);
          setWindowOpen(true);
          return;
        }
        let url = null;
        try {
          url = new URL(href, location.href);
        } catch {
          url = null;
        }
        if (url && (url.protocol === "http:" || url.protocol === "https:") && url.origin === location.origin && url.pathname !== location.pathname) {
          event.preventDefault();
          toggleMenu(false);
          navigateAfterClick(url.href);
          return;
        }
      }
      playSound("start");
    });
    const upButton = element("xp-up");
    upButton.disabled = file === HOME;
    upButton.addEventListener("click", (event) => {
      event.stopPropagation();
      navigateAfterClick(HOME);
    });
    persistWindow = () => {
      try {
        const state = {
          rect: floating,
          maximized: shell.classList.contains("xp-maximized")
        };
        sessionStorage.setItem("xp-window", JSON.stringify(state));
      } catch {
      }
    };
    const restoreWindow = () => {
      let raw = null;
      try {
        raw = sessionStorage.getItem("xp-window");
      } catch {
        return;
      }
      if (!raw) return;
      let state;
      try {
        state = JSON.parse(raw);
      } catch {
        return;
      }
      const rect = state?.rect;
      if (!rect || ![rect.x, rect.y, rect.w, rect.h].every((value) => typeof value === "number" && Number.isFinite(value))) return;
      const w = clamp(rect.w, MIN_SIZE.width, viewportW() - EDGE * 2);
      const h = clamp(rect.h, MIN_SIZE.height, viewportH() - DESKTOP.bottom - EDGE * 2);
      const x = clamp(rect.x, EDGE, viewportW() - w - EDGE);
      const y = clamp(rect.y, EDGE, viewportH() - DESKTOP.bottom - h - EDGE);
      floating = { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
      applyRect(floating);
      if (state.maximized) setMaximized(true, true);
    };
    restoreWindow();
    window.addEventListener("pagehide", () => persistWindow());
    const updateClock = () => {
      const now = /* @__PURE__ */ new Date();
      const clock = element("xp-clock");
      clock.dateTime = now.toISOString();
      clock.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };
    updateClock();
    window.setInterval(updateClock, 3e4);
    new MutationObserver(() => {
      shell.setAttribute("aria-label", document.title);
    }).observe(document.querySelector("title"), { childList: true });
    void loadSocialRibbon();
    showBoot();
  }
  document.addEventListener("DOMContentLoaded", initDesktop);
})();
//# sourceMappingURL=desktop.js.map
