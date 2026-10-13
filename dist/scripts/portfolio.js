"use strict";
(() => {
  // scripts/load-headers.ts
  function parsePageHeaders(markdown) {
    const result = {};
    const sections = markdown.split(/\n(?=## )/);
    for (const section of sections) {
      const lines = section.split("\n");
      let currentKey = null;
      let firstLine = lines[0].trim();
      if (firstLine.startsWith("## ") && !firstLine.startsWith("### ")) {
        currentKey = firstLine.replace("## ", "").trim();
      } else if (firstLine.startsWith("### ")) {
        currentKey = firstLine.replace("### ", "").trim();
      }
      if (!currentKey) continue;
      const kv = {};
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("- ") && trimmed.includes(":")) {
          const colonIdx = trimmed.indexOf(":");
          const key = trimmed.substring(2, colonIdx).trim();
          const value = trimmed.substring(colonIdx + 1).trim();
          if (key && value) {
            kv[key] = value;
          }
        }
      }
      if (Object.keys(kv).length > 0) {
        if (firstLine.startsWith("### ") && result[currentKey]) {
          Object.assign(result[currentKey], kv);
        } else {
          result[currentKey] = kv;
        }
      }
    }
    return result;
  }
  function loadPageHeaders() {
    fetch("content/page-headers.md").then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.text();
    }).then((text) => {
      const allHeaders = parsePageHeaders(text);
      const pageKey = document.body.classList.contains("portfolio-programming") ? "programming" : document.body.classList.contains("portfolio-3d") ? "3d" : document.body.classList.contains("portfolio-gamedev") ? "gamedev" : "index";
      const headers = allHeaders[pageKey];
      if (!headers) return;
      Object.entries(headers).forEach(([key, value]) => {
        if (key === "page-title") {
          document.title = value;
          return;
        }
        const el = document.querySelector(`[data-header="${key}"]`);
        if (el) el.innerHTML = value;
      });
    }).catch((e) => console.warn("Failed to load page headers:", e));
  }

  // scripts/load-footer.ts
  async function loadFooter() {
    const container = document.getElementById("footer-container");
    if (!container) return;
    try {
      const response = await fetch("footer.html");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      container.innerHTML = await response.text();
      const footer = container.querySelector("footer");
      const text = footer?.querySelector(".footer-text");
      const CATS_FOR_MS = 2e4;
      const FADE_AT_MS = 2e4;
      const FADE_MS = 5e3;
      const CAT_LIFE_MS = 3500;
      const SPAWN_EVERY_MS = 600;
      const VOLUME_SCALE = 0.2;
      const TRIPLE_MS = 500;
      const nyanVolume = () => (window.xpVolume?.() ?? 1) * VOLUME_SCALE;
      let active = false;
      let clicks = 0;
      let clickTimer = 0;
      let audio = null;
      let timers = [];
      const cats = /* @__PURE__ */ new Set();
      const spawnCat = () => {
        const image = document.createElement("img");
        image.src = "images/nyan.gif";
        image.alt = "";
        image.className = "nyan-cat";
        image.style.top = `${Math.random() * (window.innerHeight - 100)}px`;
        document.body.append(image);
        cats.add(image);
        timers.push(window.setTimeout(() => {
          image.remove();
          cats.delete(image);
        }, CAT_LIFE_MS));
      };
      const stop = () => {
        active = false;
        clicks = 0;
        window.clearTimeout(clickTimer);
        for (const id of timers) {
          window.clearTimeout(id);
          window.clearInterval(id);
        }
        timers = [];
        audio?.pause();
        for (const image of cats) image.remove();
        cats.clear();
        text?.classList.remove("rainbow-text");
      };
      const start = () => {
        active = true;
        text?.classList.add("rainbow-text");
        if (!audio) {
          audio = new Audio("audio/nyan.ogg");
          audio.preload = "auto";
        }
        audio.currentTime = 0;
        audio.volume = nyanVolume();
        void audio.play().catch(() => {
        });
        if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          spawnCat();
          const spawner = window.setInterval(spawnCat, SPAWN_EVERY_MS);
          timers.push(spawner, window.setTimeout(() => window.clearInterval(spawner), CATS_FOR_MS));
        }
        timers.push(window.setInterval(() => {
          if (!audio) return;
          const t = audio.currentTime * 1e3;
          const fade = t <= FADE_AT_MS ? 1 : Math.max(0, 1 - (t - FADE_AT_MS) / FADE_MS);
          audio.volume = Math.max(0, Math.min(1, nyanVolume() * fade));
        }, 100));
        timers.push(window.setTimeout(stop, FADE_AT_MS + FADE_MS + 120));
      };
      const activate = () => {
        if (active) {
          stop();
          return;
        }
        window.clearTimeout(clickTimer);
        clickTimer = window.setTimeout(() => {
          clicks = 0;
        }, TRIPLE_MS);
        if (++clicks === 3) {
          clicks = 0;
          start();
        }
      };
      footer?.addEventListener("click", activate);
      footer?.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          activate();
        }
      });
    } catch (error) {
      console.warn("Footer unavailable", error);
    }
  }

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

  // scripts/portfolio-common.ts
  function escapeHtml(value) {
    return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  }
  function safeUrl(value) {
    return /^(?:https?:\/\/|(?:images|audio|content)\/)/i.test(value) ? escapeHtml(value) : "";
  }
  function parseMarkdown(markdown) {
    const sections = markdown.split(/^## /m);
    const projects = [];
    for (const section of sections.slice(1)) {
      const project = { title: "", description: "", media: "" };
      for (const line of section.split(/\r?\n/)) {
        const match = line.match(/^- (\w+):\s*(.*)$/);
        if (!match) continue;
        const [, field, value] = match;
        switch (field.toLowerCase()) {
          case "title":
            project.title = value;
            break;
          case "description":
            project.description = value;
            break;
          case "media":
            project.media = value.startsWith("[") ? value.slice(1, -1).split(",").map((s) => s.trim()) : value;
            break;
          case "github":
            project.github = value;
            break;
          case "artstation":
            project.artstation = value;
            break;
          case "store":
            project.store = value;
            break;
          case "demo":
            project.demo = value;
            break;
          case "engine":
            project.engine = value;
            break;
          case "private":
            project.private = value.toLowerCase() === "true";
            break;
          case "comparison":
            project.comparison = value.toLowerCase() === "true";
            break;
          case "steam":
            project.steam = value.toLowerCase() === "true";
            break;
          case "workshop":
            project.workshop = value.toLowerCase() === "true";
            break;
          case "languages":
            project.languages = value.split(",").map((s) => s.trim()).filter(Boolean);
            break;
          case "priority": {
            const priority = Number(value);
            if (Number.isFinite(priority)) project.priority = priority;
            break;
          }
        }
      }
      if (project.title) projects.push(project);
    }
    return { projects, intro: sections[0].split("\n").slice(1).join("\n").trim() };
  }
  function parseSimpleToml(text) {
    const result = {};
    let current = "";
    for (const raw of text.split(/\r?\n/)) {
      const section = raw.trim().match(/^\[([^\]]+)\]$/);
      if (section) {
        current = section[1];
        result[current] = {};
        continue;
      }
      const pair = raw.match(/^\s*(\w+)\s*=\s*"([^"]*)"/);
      if (pair && current) result[current][pair[1]] = pair[2];
    }
    return result;
  }
  function createCarousel(images, id) {
    return `<div class="carousel-container" id="carousel-${id}">${images.map((image, i) => `<img src="${safeUrl(image)}" alt="Project view ${i + 1}" class="carousel-image ${i === 0 ? "active" : ""}">`).join("")}
        <button class="carousel-nav carousel-prev" data-carousel-step="-1" aria-label="Previous image">&lt;</button>
        <button class="carousel-nav carousel-next" data-carousel-step="1" aria-label="Next image">&gt;</button>
        <div class="carousel-dots">${images.map((_, i) => `<button class="carousel-dot ${i === 0 ? "active" : ""}" data-carousel-index="${i}" aria-label="Show image ${i + 1}"></button>`).join("")}</div></div>`;
  }
  function renderMedia(project, id) {
    const media = project.media;
    if (!media) return `<div class="media-placeholder" role="img" aria-label="${escapeHtml(project.title)}"></div>`;
    if (Array.isArray(media)) return createCarousel(media, id);
    const title = escapeHtml(project.title);
    if (/\.(mp4|webm|mov|ogv)(\?.*)?$/i.test(media)) return `<video src="${safeUrl(media)}" aria-label="${title}" autoplay muted loop playsinline controls></video>`;
    const youtube = media.match(/(?:youtu\.be\/|[?&]v=|youtube\.com\/embed\/)([\w-]+)/);
    if (youtube) return `<iframe title="${title}" src="https://www.youtube.com/embed/${youtube[1]}" allowfullscreen></iframe>`;
    const sketchfab = media.match(/sketchfab\.com\/models\/([\w-]+)/);
    if (sketchfab) return `<iframe title="${title}" src="https://sketchfab.com/models/${sketchfab[1]}/embed?autostart=0" data-autoplay-url="https://sketchfab.com/models/${sketchfab[1]}/embed?autostart=1" allowfullscreen></iframe>`;
    return `<img src="${safeUrl(media)}" alt="${title}" loading="lazy">`;
  }
  function createUnifiedProjectCard(project, id, options = {}) {
    const hasStore = Boolean(project.store);
    const links = (options.badgeOrder ?? ["private", "demo", "github"]).flatMap((key) => {
      if (key === "private") return [];
      const url = project[key];
      return url ? [`<a class="${key}-link" href="${safeUrl(url)}" target="_blank" rel="noopener noreferrer">${key === "github" ? "GitHub" : key === "artstation" ? "ArtStation" : "Demo"}</a>`] : [];
    });
    const privateTag = project.private && !hasStore ? '<span class="private-tag">Private</span>' : "";
    const orderedBadges = [...links, privateTag].filter(Boolean);
    const primary = options.multiBadge ? orderedBadges : orderedBadges.slice(0, 1);
    const badgeHtml = primary.join("") || (!hasStore && options.fallbackBadge === "private" ? '<span class="private-tag">Private</span>' : "");
    const languages = options.showLanguageNotches ? (project.languages ?? []).slice(0, 3).map((language) => `<span class="language-notch language-${escapeHtml(language.toLowerCase().replace("c++", "cpp").replace("c#", "csharp"))}">${escapeHtml(language)}</span>`).join("") : "";
    const engine = options.alwaysShowEngineTag ? `<div class="game-tag">${escapeHtml(project.engine ?? "Game")}</div>` : "";
    const store = project.store ? `<a class="store-link" href="${safeUrl(project.store)}" target="_blank" rel="noopener noreferrer">Store</a>` : "";
    return `<article class="project-card" data-project-id="${id}" tabindex="0" aria-label="Open ${escapeHtml(project.title)}">
        <div class="xp-titlebar xp-focus-bar" aria-hidden="true">${icon("folder", 16)}<span class="xp-title">${escapeHtml(project.title)}</span><div class="xp-window-controls"><button class="xp-focus-min" type="button" aria-label="Minimize" tabindex="-1"><span class="xp-glyph-min"></span></button><button class="xp-focus-max" type="button" aria-label="Maximize" tabindex="-1"><span class="xp-glyph-max"></span></button><button class="xp-focus-close xp-close" type="button" aria-label="Close" tabindex="-1"><span class="xp-glyph-close"></span></button></div></div>
        <div class="project-badges">${badgeHtml}${store}${languages}${engine}</div>
        <div class="project-media">${renderMedia(project, id)}</div>
        <div class="project-info"><h3>${escapeHtml(project.title)}</h3><p>${escapeHtml(project.description)}</p></div></article>`;
  }
  function initNameAnimation() {
    const heading = document.querySelector("#name-display h1");
    const indicator = document.querySelector(".name-indicator");
    if (!heading || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const caret = heading.querySelector(".cursor");
    const paint = (markup) => {
      heading.innerHTML = markup;
      if (caret) heading.append(caret);
    };
    const names = ["Ubeid Hussein", "Ultikynnys", "R60D"];
    const SCRAMBLE_STEP_MS = 40;
    const SCRAMBLE_FLICKER_MS = 10;
    const SCRAMBLE_RANGES = [
      [33, 126],
      [161, 328],
      [330, 353],
      [356, 383],
      [402, 402],
      [538, 539],
      [700, 700],
      [710, 711],
      [713, 715],
      [727, 733],
      [768, 769],
      [806, 806],
      [821, 821],
      [890, 890],
      [894, 894],
      [900, 906],
      [908, 908],
      [910, 929],
      [931, 974],
      [1024, 1119],
      [1122, 1123],
      [1130, 1131],
      [1138, 1141],
      [1168, 1181],
      [1184, 1189],
      [1194, 1201],
      [1206, 1211],
      [1216, 1218],
      [1227, 1228],
      [1231, 1241],
      [1244, 1247],
      [1250, 1257],
      [1262, 1273],
      [1306, 1309],
      [1316, 1317],
      [8211, 8213],
      [8216, 8218],
      [8220, 8222],
      [8224, 8226],
      [8230, 8230],
      [8240, 8240],
      [8249, 8250],
      [8260, 8260],
      [8308, 8308],
      [8364, 8364],
      [8366, 8367],
      [8372, 8372],
      [8376, 8376],
      [8381, 8381],
      [8470, 8470],
      [8482, 8482],
      [8592, 8595],
      [8706, 8706],
      [8710, 8710],
      [8719, 8719],
      [8721, 8721],
      [8725, 8725],
      [8730, 8730],
      [8734, 8734],
      [8747, 8747],
      [8776, 8776],
      [8800, 8800],
      [8804, 8805],
      [9650, 9650],
      [9654, 9654],
      [9660, 9660],
      [9664, 9664],
      [9674, 9674],
      [9733, 9734],
      [9824, 9824],
      [9827, 9827],
      [9829, 9830],
      [9834, 9834],
      [61696, 61697],
      [63743, 63743],
      [64257, 64258]
    ];
    const SCRAMBLE_CHARS = SCRAMBLE_RANGES.flatMap(([start, end]) => {
      const chars = [];
      for (let code = start; code <= end; code++) chars.push(String.fromCharCode(code));
      return chars;
    });
    let deck = [];
    let draw = 0;
    const nextScrambleChar = () => {
      if (draw >= deck.length) {
        deck = [...SCRAMBLE_CHARS];
        for (let i = deck.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          const swap = deck[i];
          deck[i] = deck[j];
          deck[j] = swap;
        }
        draw = 0;
      }
      return deck[draw++];
    };
    let index = 0;
    window.setInterval(() => {
      index = (index + 1) % names.length;
      const target = names[index];
      const started = performance.now();
      const timer = window.setInterval(() => {
        const position = Math.min(target.length, Math.floor((performance.now() - started) / SCRAMBLE_STEP_MS));
        const noise = Array.from({ length: target.length - position }, () => `<span class="name-scramble">${escapeHtml(nextScrambleChar())}</span>`).join("");
        paint(escapeHtml(target.slice(0, position)) + noise);
        if (position >= target.length) {
          clearInterval(timer);
          paint(escapeHtml(target));
        }
      }, SCRAMBLE_FLICKER_MS);
      if (indicator) indicator.textContent = index === 0 ? "Full name" : "Alias";
    }, 8e3);
  }
  function setupProjectExpansion() {
    const container = document.getElementById("projects-container");
    if (!container) return;
    const TASKBAR = 30;
    const clamp = (value, min, max) => Math.min(Math.max(value, min), Math.max(min, max));
    let expanded = null;
    const close = () => {
      if (expanded) {
        expanded.classList.remove("expanded", "win-maximized");
        expanded.style.left = "";
        expanded.style.top = "";
        expanded.style.width = "";
        expanded.style.height = "";
      }
      expanded = null;
      container.classList.remove("has-expanded");
      document.getElementById("overlay")?.classList.remove("active");
      document.body.classList.remove("body-no-scroll");
    };
    const open = (event) => {
      const target = event.target;
      if (!(target instanceof Element) || target.closest("a, button, video, iframe") || document.body.classList.contains("yasuo-mode-active")) return;
      const card = target.closest(".project-card");
      if (!card || card === expanded) return;
      close();
      expanded = card;
      card.classList.add("expanded");
      container.classList.add("has-expanded");
      const vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight;
      const w = Math.min(1e3, Math.max(340, vw - 96));
      const h = Math.min(680, Math.max(240, vh - 120));
      card.style.width = `${w}px`;
      card.style.height = `${h}px`;
      card.style.left = `${Math.max(0, Math.round((vw - w) / 2))}px`;
      card.style.top = `${Math.max(0, Math.round((vh - h) / 2))}px`;
      document.getElementById("overlay")?.classList.add("active");
      document.body.classList.add("body-no-scroll");
    };
    container.addEventListener("click", open);
    container.addEventListener("keydown", (event) => {
      if (event.key === "Enter") open(event);
    });
    container.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element) || !expanded) return;
      if (target.closest(".xp-focus-close") || target.closest(".xp-focus-min")) {
        close();
        return;
      }
      if (target.closest(".xp-focus-max")) {
        const maximized = expanded.classList.toggle("win-maximized");
        expanded.querySelector(".xp-focus-max span")?.setAttribute("class", maximized ? "xp-glyph-restore" : "xp-glyph-max");
        target.closest(".xp-focus-max")?.setAttribute("aria-label", maximized ? "Restore window" : "Maximize window");
      }
    });
    let drag = null;
    container.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || !expanded) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const bar = target.closest(".xp-focus-bar");
      if (!bar || !expanded.contains(bar) || target.closest(".xp-window-controls") || expanded.classList.contains("win-maximized")) return;
      const rect = expanded.getBoundingClientRect();
      drag = { id: event.pointerId, dx: event.clientX - rect.left, dy: event.clientY - rect.top };
      bar.setPointerCapture(event.pointerId);
      document.body.classList.add("xp-dragging");
    });
    container.addEventListener("pointermove", (event) => {
      if (!drag || !expanded || event.pointerId !== drag.id) return;
      const vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight;
      expanded.style.left = `${clamp(event.clientX - drag.dx, 0, vw - expanded.offsetWidth)}px`;
      expanded.style.top = `${clamp(event.clientY - drag.dy, 0, vh - TASKBAR - expanded.offsetHeight)}px`;
    });
    const endDrag = (event) => {
      if (!drag || event.pointerId !== drag.id) return;
      drag = null;
      document.body.classList.remove("xp-dragging");
    };
    container.addEventListener("pointerup", endDrag);
    container.addEventListener("pointercancel", endDrag);
    document.addEventListener("click", (event) => {
      if (expanded && event.target instanceof Element && !event.target.closest(".project-card.expanded")) close();
    });
    document.getElementById("overlay")?.addEventListener("click", close);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") close();
    });
  }
  function initCarousels() {
    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest("[data-carousel-step], [data-carousel-index]");
      const carousel = button?.closest(".carousel-container");
      if (!button || !carousel) return;
      event.stopPropagation();
      const images = [...carousel.querySelectorAll(".carousel-image")];
      if (!images.length) return;
      const current = images.findIndex((image) => image.classList.contains("active"));
      const index = button.dataset.carouselIndex !== void 0 ? Number(button.dataset.carouselIndex) : (current + Number(button.dataset.carouselStep) + images.length) % images.length;
      images.forEach((image, i) => image.classList.toggle("active", i === index));
      carousel.querySelectorAll(".carousel-dot").forEach((dot, i) => dot.classList.toggle("active", i === index));
    });
  }
  async function initPortfolio(file, options) {
    const container = element("projects-container");
    try {
      const response = await fetch(file);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const { projects } = parseMarkdown(await response.text());
      projects.sort((a, b) => (a.priority ?? Infinity) - (b.priority ?? Infinity));
      container.innerHTML = projects.map((project, index) => {
        if (project.store?.includes("steamcommunity.com") && /TF2|Team Fortress/.test(project.title + project.description)) project.private = true;
        return createUnifiedProjectCard(project, index, options);
      }).join("");
    } catch (error) {
      container.textContent = `Failed to load projects: ${error instanceof Error ? error.message : String(error)}`;
    }
    container.addEventListener("mouseover", (event) => {
      if (!(event.target instanceof Element)) return;
      const frame = event.target.closest(".project-card")?.querySelector("iframe[data-autoplay-url]");
      if (frame?.dataset.autoplayUrl) {
        frame.src = frame.dataset.autoplayUrl;
        delete frame.dataset.autoplayUrl;
      }
    });
  }
  var NYAN_EYES = [{ x: 0.7726, y: 0.569 }, { x: 0.9038, y: 0.569 }];
  function initSecretMode() {
    const heading = document.querySelector("#name-display h1");
    if (!heading) return;
    let clicks = 0;
    let timer = 0;
    let slices = 0;
    let finished = 0;
    let catKills = 0;
    let catMilestonePlayed = false;
    const play = (file, scale = 1) => {
      const clip = new Audio(file);
      const level = window.xpVolume?.();
      if (typeof level === "number") clip.volume = Math.min(1, Math.max(0, level * scale));
      void clip.play().catch(() => void 0);
    };
    const indicator = document.createElement("img");
    indicator.id = "yasuo-mode-indicator";
    indicator.src = "images/yasuo.png";
    indicator.alt = "Yasuo Mode Active";
    document.body.append(indicator);
    const setActive = (on) => {
      document.body.classList.toggle("yasuo-mode-active", on);
      indicator.classList.toggle("active", on);
      if (on) {
        catKills = 0;
        catMilestonePlayed = false;
      }
    };
    let endTimer = 0;
    const deactivate = () => {
      if (!document.body.classList.contains("yasuo-mode-active")) return;
      window.clearTimeout(endTimer);
      setActive(false);
      document.querySelectorAll(".project-card, .portfolio-choice").forEach((card) => {
        card.style.visibility = "";
        card.style.pointerEvents = "";
      });
      play(`audio/YasuoFinished${finished++ % 2 === 0 ? "A" : "B"}.ogg`);
    };
    const slashAt = (centerX, centerY) => {
      const swordX = `${centerX - 150}px`, swordY = `${centerY - 150}px`;
      for (const trail of [{ cls: "yasuo-ghost-3", delay: ".036s" }, { cls: "yasuo-ghost-2", delay: ".024s" }, { cls: "yasuo-ghost", delay: ".012s" }, { cls: "", delay: "" }]) {
        const sword = document.createElement("img");
        sword.src = "images/YasouSword.png";
        sword.alt = "";
        sword.className = `yasuo-sword slash-left-to-right${trail.cls ? ` ${trail.cls}` : ""}`;
        sword.style.left = swordX;
        sword.style.top = swordY;
        if (trail.delay) sword.style.animationDelay = trail.delay;
        document.body.append(sword);
        sword.addEventListener("animationend", () => sword.remove(), { once: true });
      }
    };
    const flashAt = (centerX, centerY, length, angleDeg) => {
      const flash = document.createElement("div");
      flash.className = "flash-slice";
      flash.style.left = `${Math.round(centerX)}px`;
      flash.style.top = `${Math.round(centerY)}px`;
      flash.style.setProperty("--flash-len", `${Math.round(length)}px`);
      flash.style.transform = `translate(-50%, -50%) rotate(${angleDeg}deg)`;
      document.body.append(flash);
      flash.addEventListener("animationend", () => flash.remove(), { once: true });
    };
    const flashSpan = (width, height) => Math.hypot(width, height) * 1.35;
    const freezeFrame = (cat) => {
      const canvas = document.createElement("canvas");
      canvas.width = cat.naturalWidth;
      canvas.height = cat.naturalHeight;
      const context = canvas.getContext("2d");
      if (!context) return null;
      context.drawImage(cat, 0, 0);
      return canvas;
    };
    const bloodMist = (box) => {
      const centerX = box.left + box.width / 2, centerY = box.top + box.height / 2;
      const puff = document.createElement("div");
      puff.className = "blood-puff";
      puff.style.left = `${centerX}px`;
      puff.style.top = `${centerY}px`;
      document.body.append(puff);
      puff.addEventListener("animationend", () => puff.remove(), { once: true });
      for (let i = 0; i < 18; i++) {
        const drop = document.createElement("div");
        drop.className = "blood-drop";
        const angle = Math.random() * Math.PI * 2, reach = box.width * (0.1 + Math.random() * 0.28);
        drop.style.left = `${centerX}px`;
        drop.style.top = `${centerY}px`;
        drop.style.width = `${2 + Math.random() * 5}px`;
        drop.style.height = drop.style.width;
        drop.style.animationDelay = `${Math.round(Math.random() * 60)}ms`;
        drop.style.setProperty("--bx", `${Math.cos(angle) * reach}px`);
        drop.style.setProperty("--by", `${Math.sin(angle) * reach + box.height * 0.35}px`);
        document.body.append(drop);
        drop.addEventListener("animationend", () => drop.remove(), { once: true });
      }
    };
    const sliceCat = (cat) => {
      play(`audio/Yasuo_Original_BasicAttack_${Math.floor(Math.random() * 4)}.ogg`);
      const box = cat.getBoundingClientRect();
      slashAt(box.left + box.width / 2, box.top + box.height / 2);
      cat.style.animationPlayState = "paused";
      const frozen = freezeFrame(cat);
      if (++catKills > 10 && !catMilestonePlayed) {
        catMilestonePlayed = true;
        play("audio/Yasuo_Original_Move_13.ogg", 0.5);
      }
      window.setTimeout(() => {
        play(`audio/metal${Math.floor(Math.random() * 5) + 1}.ogg`);
        play("audio/cat-meow.ogg", 0.25);
        flashAt(box.left + box.width / 2, box.top + box.height / 2, flashSpan(box.width, box.height), Math.atan2(box.height, box.width) * (180 / Math.PI));
        bloodMist(box);
        for (const isTop of [true, false]) {
          const half = document.createElement("div");
          half.className = `cat-half ${isTop ? "cat-half-top" : "cat-half-bottom"}`;
          half.style.left = `${box.left}px`;
          half.style.top = `${box.top}px`;
          half.style.width = `${box.width}px`;
          half.style.height = `${box.height}px`;
          let frame;
          if (frozen) {
            const copy = document.createElement("canvas");
            copy.width = frozen.width;
            copy.height = frozen.height;
            copy.getContext("2d")?.drawImage(frozen, 0, 0);
            frame = copy;
          } else {
            frame = cat.cloneNode(true);
          }
          frame.className = "";
          frame.style.cssText = `position:absolute;left:0;top:0;width:100%;height:100%;transform:none;margin:0;`;
          half.append(frame);
          for (const eye of NYAN_EYES) {
            if (eye.y < 0.5 !== isTop) continue;
            const cross = document.createElement("span");
            cross.className = "cat-eye-x";
            const size = box.width * 0.05;
            cross.style.width = `${size}px`;
            cross.style.height = `${size}px`;
            cross.style.left = `${eye.x * box.width - size / 2}px`;
            cross.style.top = `${eye.y * box.height - size / 2}px`;
            half.append(cross);
          }
          document.body.append(half);
          half.addEventListener("animationend", () => half.remove(), { once: true });
        }
        cat.remove();
      }, 150);
    };
    const attack = (card) => {
      if (card.style.visibility === "hidden") return;
      play(`audio/Yasuo_Original_BasicAttack_${Math.floor(Math.random() * 4)}.ogg`);
      const rect = card.getBoundingClientRect();
      slashAt(rect.left + rect.width / 2, rect.top + rect.height / 2);
      card.style.visibility = "hidden";
      card.style.pointerEvents = "none";
      window.setTimeout(() => {
        play(`audio/metal${Math.floor(Math.random() * 5) + 1}.ogg`);
        const box = card.getBoundingClientRect();
        const host = document.querySelector(".xp-content") ?? document.body;
        const base = (host.closest(".xp-window") ?? document.body).getBoundingClientRect();
        const left = box.left - base.left, top = box.top - base.top;
        flashAt(box.left + box.width / 2, box.top + box.height / 2, flashSpan(box.width, box.height), Math.atan2(box.height, box.width) * (180 / Math.PI));
        for (const isTop of [true, false]) {
          const half = document.createElement("div");
          half.className = `card-half ${isTop ? "card-half-top" : "card-half-bottom"}`;
          half.style.width = `${box.width}px`;
          half.style.height = `${box.height}px`;
          half.style.left = `${left}px`;
          half.style.top = `${top}px`;
          const clone = card.cloneNode(true);
          clone.style.visibility = "visible";
          clone.style.margin = "0";
          clone.style.pointerEvents = "";
          clone.classList.remove("expanded", "win-maximized");
          clone.removeAttribute("data-project-id");
          clone.style.position = "absolute";
          clone.style.left = "0";
          clone.style.width = "100%";
          clone.style.height = "100%";
          clone.style.top = isTop ? "0" : `-${box.height / 2}px`;
          half.append(clone);
          host.append(half);
          half.addEventListener("animationend", () => half.remove(), { once: true });
        }
      }, 150);
      if (++slices === 7) endTimer = window.setTimeout(deactivate, 700);
    };
    heading.addEventListener("click", () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        clicks = 0;
      }, 500);
      if (++clicks === 3) {
        clicks = 0;
        slices = 0;
        window.clearTimeout(endTimer);
        if (document.body.classList.contains("yasuo-mode-active")) deactivate();
        else setActive(true);
      }
    });
    document.addEventListener("click", (event) => {
      if (!document.body.classList.contains("yasuo-mode-active") || !(event.target instanceof Element)) return;
      const cat = event.target.closest(".nyan-cat");
      if (cat) {
        event.preventDefault();
        event.stopPropagation();
        sliceCat(cat);
        return;
      }
      const card = event.target.closest(".project-card, .portfolio-choice");
      if (!card) return;
      event.preventDefault();
      event.stopPropagation();
      attack(card);
    }, true);
  }
  async function loadLanguageColors() {
    try {
      const response = await fetch("content/language_colors.toml");
      if (!response.ok) return;
      const colors = parseSimpleToml(await response.text());
      const style = document.createElement("style");
      style.textContent = Object.entries(colors).filter(([code, cfg]) => /^[\w-]+$/.test(code) && /^#[\da-f]{3,8}$/i.test(cfg.bg) && /^#[\da-f]{3,8}$/i.test(cfg.fg)).map(([code, cfg]) => `.language-${code}{background:${cfg.bg};color:${cfg.fg}}`).join("\n");
      document.head.append(style);
    } catch (error) {
      console.warn("Language colors unavailable", error);
    }
  }

  // scripts/portfolio.ts
  document.addEventListener("DOMContentLoaded", () => {
    loadPageHeaders();
    void loadFooter();
    void loadLanguageColors();
    initNameAnimation();
    initCarousels();
    initSecretMode();
    setupProjectExpansion();
    const pages = [
      { className: "portfolio-programming", file: "projects/programming-projects.md", options: { badgeOrder: ["private", "demo", "github"], fallbackBadge: "private", multiBadge: true, showLanguageNotches: true } },
      { className: "portfolio-3d", file: "projects/3d-projects.md", options: { badgeOrder: ["private", "demo", "artstation"] } },
      { className: "portfolio-gamedev", file: "projects/games.md", options: { badgeOrder: ["private", "demo", "github", "artstation"], alwaysShowEngineTag: true } }
    ];
    const page = pages.find((page2) => document.body.classList.contains(page2.className));
    if (page) void initPortfolio(page.file, page.options);
  });
})();
//# sourceMappingURL=portfolio.js.map
