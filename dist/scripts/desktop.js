"use strict";
(() => {
  // scripts/dom.ts
  function element(id) {
    const node = document.getElementById(id);
    if (!node) throw new Error(`Required element #${id} was not found`);
    return node;
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

  // scripts/social-ribbon.ts
  function parseContactsToml(text) {
    const config = { profile: {}, social: {}, ribbon: { order: [] } };
    let section = "";
    let subsection = "";
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      const header = line.match(/^\[(\w+)(?:\.(\w+))?\]$/);
      if (header) {
        section = header[1];
        subsection = header[2] ?? "";
        if (section === "social" && subsection) config.social[subsection] = {};
        continue;
      }
      const pair = line.match(/^(\w+)\s*=\s*(.+)$/);
      if (!pair) continue;
      const [, key, rawValue] = pair;
      const value = rawValue.startsWith("[") ? rawValue.slice(1, -1).split(",").map((s) => s.trim().replace(/"/g, "")) : rawValue === "true" ? true : rawValue === "false" ? false : rawValue.replace(/^"|"$/g, "");
      if (section === "social" && subsection) config.social[subsection][key] = value;
      else if (section === "profile") config.profile[key] = value;
      else if (section === "ribbon" && key === "order" && Array.isArray(value)) config.ribbon.order = value;
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
      const response = await fetch("config/contacts.toml");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const config = parseContactsToml(await response.text());
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
  var XP_SOUNDS = { start: "audio/xp-start.wav", minimize: "audio/xp-minimize.wav", restore: "audio/xp-restore.wav", startup: "audio/xp-startup.wav" };
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
  getClip("startup");
  function playStartup() {
    const clip = getClip("startup");
    if (!clip) return;
    try {
      clip.volume = (window.xpVolume?.() ?? 1) * 0.25;
      clip.currentTime = 0;
      void clip.play().catch(() => {
      });
    } catch {
    }
  }
  var destinations = [
    { title: "My Portfolio", href: "index.html", icon: "computer", detail: "Welcome to my portfolio" },
    { title: "Programming", href: "programming-portfolio.html", icon: "folder", detail: "Software & engineering" },
    { title: "3D Art", href: "3d-portfolio.html", icon: "pictures", detail: "Models & environments" },
    { title: "Game Development", href: "gamedev-portfolio.html", icon: "game", detail: "Games & interactive worlds" },
    { title: "My CV", href: "cv_template.html", icon: "document", detail: "Experience & skills" }
  ];
  var DESKTOP = { top: 26, left: 124, right: 138, bottom: 30 };
  var MIN_SIZE = { width: 340, height: 240 };
  var EDGE = 8;
  var XP_CURSOR_HOTSPOTS = {
    arrow: { x: 3, y: 4 },
    pointer: { x: 7, y: 3 },
    text: { x: 6, y: 10 },
    move: { x: 12, y: 12 },
    "resize-h": { x: 12, y: 12 },
    "resize-v": { x: 12, y: 14 },
    "resize-se": { x: 10, y: 10 },
    "resize-sw": { x: 10, y: 10 }
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
    screen.innerHTML = `<div class="xp-boot-brand"><img class="xp-boot-flag" src="${ICONS.flag}" width="140" height="100" alt=""><p>Ubeid Hussein</p><h1>Portfolio<span>xp</span></h1><p class="xp-boot-edition">Creative Professional Edition</p><div class="xp-boot-progress" role="status" aria-label="Starting portfolio"><img class="xp-boot-track" src="${bootTrack}" alt=""><div class="xp-boot-clip"><div class="xp-boot-blocks"><img src="${bootBlock}" alt=""><img src="${bootBlock}" alt=""><img src="${bootBlock}" alt=""></div></div></div><p class="xp-boot-status">Starting your desktop...</p></div>`;
    document.body.append(screen);
    const shell = element("xp-shell");
    shell.inert = true;
    const taskbar = element("xp-taskbar");
    taskbar.inert = true;
    const shortcuts = element("xp-shortcuts");
    shortcuts.inert = true;
    const previousFocus = document.activeElement;
    let timer = 0;
    const dismiss = () => {
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
      playStartup();
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
    toolbar.innerHTML = `<button id="xp-back" class="xp-tb" type="button"><span class="xp-tb-arrow">\u25C4</span>Back</button><button id="xp-forward" class="xp-tb" type="button"><span class="xp-tb-arrow">\u25BA</span>Forward</button>`;
    const content = document.createElement("div");
    content.className = "xp-content";
    for (const node of [...document.body.childNodes]) {
      if (node instanceof HTMLScriptElement) continue;
      if (node instanceof HTMLElement && node.id === "themeToggle") {
        node.remove();
        continue;
      }
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
    shortcuts.innerHTML = destinations.slice(0, 4).map((item) => `<a href="${item.href}">${icon(item.icon, 32)}<span>${item.title}</span></a>`).join("");
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
    menu.innerHTML = `<div class="xp-user"><img src="images/Profile.png" alt=""><span>Ubeid Hussein</span></div><div class="xp-menu-body"><div class="xp-menu-apps">${destinations.map((item) => `<a href="${item.href}">${icon(item.icon, 24)}<span><strong>${item.title}</strong><small>${item.detail}</small></span></a>`).join("")}</div><div class="xp-menu-side"></div></div><div class="xp-menu-footer"><span>Making cool shit since 1999</span><button class="xp-menu-power" id="xp-reboot"><img class="xp-menu-power-icon" src="images/xp/restart.png" width="24" height="24" alt="">Restart</button></div>`;
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
        cursorElement.style.left = `${event.clientX - hotspot.x * 1.5}px`;
        cursorElement.style.top = `${event.clientY - hotspot.y * 1.5}px`;
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
      const maxX = Math.max(EDGE, viewportW() - shell.offsetWidth - EDGE);
      const maxY = Math.max(EDGE, viewportH() - DESKTOP.bottom - shell.offsetHeight - EDGE);
      shell.style.left = `${Math.min(Math.max(EDGE, x), maxX)}px`;
      shell.style.top = `${Math.min(Math.max(EDGE, y), maxY)}px`;
    };
    const sizeTo = (w, h) => {
      shell.style.width = `${Math.min(Math.max(MIN_SIZE.width, w), viewportW() - shell.offsetLeft - EDGE)}px`;
      shell.style.height = `${Math.min(Math.max(MIN_SIZE.height, h), viewportH() - shell.offsetTop - DESKTOP.bottom - EDGE)}px`;
    };
    let floating = defaultRect();
    applyRect(floating);
    const maximizeButton = element("xp-maximize");
    const setMaximized = (maximized) => {
      playSound("restore");
      if (maximized) floating = readRect();
      shell.classList.toggle("xp-maximized", maximized);
      if (maximized) {
        shell.style.left = "";
        shell.style.top = "";
        shell.style.width = "";
        shell.style.height = "";
      } else applyRect(floating);
      maximizeButton.setAttribute("aria-pressed", String(maximized));
      maximizeButton.setAttribute("aria-label", maximized ? "Restore window" : "Maximize window");
      maximizeButton.innerHTML = maximized ? '<span class="xp-glyph-restore"></span>' : '<span class="xp-glyph-max"></span>';
    };
    maximizeButton.addEventListener("click", () => setMaximized(!shell.classList.contains("xp-maximized")));
    titlebar.addEventListener("dblclick", (event) => {
      if (!(event.target instanceof Element && event.target.closest(".xp-window-controls"))) setMaximized(!shell.classList.contains("xp-maximized"));
    });
    const task = element("xp-task");
    const minimize = (hidden) => {
      playSound(hidden ? "minimize" : "restore");
      shell.hidden = hidden;
      task.setAttribute("aria-expanded", String(!hidden));
      if (hidden) task.focus();
      else shell.focus({ preventScroll: true });
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
    const backButton = element("xp-back");
    const forwardButton = element("xp-forward");
    const readNav = (key) => {
      try {
        return sessionStorage.getItem(key);
      } catch {
        return null;
      }
    };
    const writeNav = (key, value) => {
      try {
        sessionStorage.setItem(key, value);
      } catch {
      }
    };
    const arrivedVia = readNav("xp-nav-mark") ?? "";
    const tracked = readNav("xp-nav-depth") !== null;
    let backDepth = Number(readNav("xp-nav-depth") ?? "0") || 0;
    let aheadDepth = Number(readNav("xp-nav-ahead") ?? "0") || 0;
    if (arrivedVia === "back") {
      backDepth = Math.max(0, backDepth - 1);
      aheadDepth += 1;
    } else if (arrivedVia === "forward") {
      backDepth += 1;
      aheadDepth = Math.max(0, aheadDepth - 1);
    } else {
      backDepth = tracked ? backDepth + 1 : 0;
      aheadDepth = 0;
    }
    writeNav("xp-nav-mark", "");
    writeNav("xp-nav-depth", String(backDepth));
    writeNav("xp-nav-ahead", String(aheadDepth));
    backButton.disabled = backDepth <= 0;
    forwardButton.disabled = aheadDepth <= 0;
    backButton.addEventListener("click", () => {
      writeNav("xp-nav-mark", "back");
      history.back();
    });
    forwardButton.addEventListener("click", () => {
      writeNav("xp-nav-mark", "forward");
      history.forward();
    });
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
