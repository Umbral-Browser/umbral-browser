// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

{
  let lazy = {};

  ChromeUtils.defineESModuleGetters(lazy, {
    SearchService: "moz-src:///toolkit/components/search/SearchService.sys.mjs",
  });

  const { DefaultBrowserHelper } = ChromeUtils.importESModule(
    "chrome://browser/content/preferences/DefaultBrowserHelper.mjs",
    { global: "current" },
  );

  const kSystemThemePref = "ui.systemUsesDarkTheme";
  const kZenElementsToIgnore = [
    "zen-browser-background",
    "zen-toast-container",
  ];

  function clearBrowserElements() {
    for (const element of document.getElementById("browser").children) {
      if (kZenElementsToIgnore.includes(element.id)) {
        continue;
      }
      element.style.display = "none";
    }
  }

  function getMotion() {
    return gZenUIManager.motion;
  }

  function animate(target, keyframes, options) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      let elements = target;
      if (typeof target === "string") {
        elements = document.querySelectorAll(target);
      } else if (Element.isInstance(target)) {
        elements = [target];
      }
      if (keyframes?.opacity) {
        const opacity = Array.isArray(keyframes.opacity)
          ? keyframes.opacity.at(-1)
          : keyframes.opacity;
        for (const element of elements) {
          element.style.opacity = opacity;
        }
      }
      return Promise.resolve();
    }
    return getMotion().animate(target, keyframes, options);
  }

  async function initializeZenWelcome() {
    document.documentElement.setAttribute("zen-welcome-stage", "true");
    const XUL = `
      <html:div id="zen-welcome" role="dialog" aria-modal="true" aria-labelledby="zen-welcome-title">
        <html:div id="zen-welcome-start">
          <html:img class="umbral-welcome-logo logo-light" src="chrome://branding/content/umbral-logo-light.png" alt="Umbral" />
          <html:img class="umbral-welcome-logo logo-dark" src="chrome://branding/content/umbral-logo-dark.png" alt="Umbral" />
          <html:h1 id="zen-welcome-title" data-l10n-id="zen-welcome-title"></html:h1>
          <html:p id="zen-welcome-intro" data-l10n-id="zen-welcome-intro"></html:p>
          <button class="zen-welcome-primary" id="zen-welcome-start-button" data-l10n-id="zen-welcome-start"></button>
        </html:div>
        <html:div id="zen-welcome-pages">
          <html:aside id="zen-welcome-rail">
            <html:img class="umbral-welcome-rail-logo logo-light" src="chrome://branding/content/umbral-logo-light.png" alt="Umbral" />
            <html:img class="umbral-welcome-rail-logo logo-dark" src="chrome://branding/content/umbral-logo-dark.png" alt="Umbral" />
            <html:ol id="zen-welcome-stepper" data-l10n-id="zen-welcome-progress">
              <html:li aria-current="step" data-l10n-id="zen-welcome-step-welcome"></html:li>
              <html:li data-l10n-id="zen-welcome-step-search"></html:li>
              <html:li data-l10n-id="zen-welcome-step-theme"></html:li>
              <html:li data-l10n-id="zen-welcome-step-ready"></html:li>
            </html:ol>
            <html:p id="zen-welcome-rail-note" data-l10n-id="zen-welcome-rail-note"></html:p>
          </html:aside>
          <html:main id="zen-welcome-main">
            <html:header id="zen-welcome-page-heading">
              <html:button id="zen-welcome-back" data-l10n-id="zen-welcome-back"></html:button>
              <html:div id="zen-welcome-page-title"></html:div>
            </html:header>
            <html:section id="zen-welcome-page-content"></html:section>
            <html:footer id="zen-welcome-page-buttons"></html:footer>
          </html:main>
        </html:div>
      </html:div>
    `;
    const welcome = window.MozXULElement.parseXULToFragment(XUL);
    document.getElementById("browser").appendChild(welcome);
    window.MozXULElement.insertFTLIfNeeded("browser/zen-welcome.ftl");
    await document.l10n.translateFragment(
      document.getElementById("zen-welcome"),
    );
  }

  function createOption({ id, group, checked, l10n, text, extra }) {
    const label = document.createElement("label");
    label.className = "zen-welcome-option";
    label.setAttribute("for", id);
    const input = document.createElement("input");
    input.type = "radio";
    input.id = id;
    input.name = group;
    input.checked = !!checked;
    label.appendChild(input);
    const radio = document.createElement("span");
    radio.className = "zen-welcome-option-radio no-squircles";
    label.appendChild(radio);
    if (extra) {
      label.appendChild(extra);
    }
    const labelText = document.createElement("span");
    labelText.className = "zen-welcome-option-label";
    if (l10n) {
      document.l10n.setAttributes(labelText, l10n);
    } else {
      labelText.textContent = text;
    }
    label.appendChild(labelText);
    return label;
  }

  const kSpring = { type: "spring", bounce: 0.35, visualDuration: 0.35 };
  const kExit = { duration: 0.12, ease: "easeIn" };
  const kFade = { duration: 0.25, ease: "easeOut" };

  class nsZenWelcomePages {
    #index = -1;
    #pages;
    #content = null;
    #renderToken = 0;
    #buttonsToken = 0;

    constructor(pages) {
      this.#pages = pages;
      this.init();
      this.next();
    }

    get textContainer() {
      return document.getElementById("zen-welcome-page-title");
    }

    get contentContainer() {
      return document.getElementById("zen-welcome-page-content");
    }

    get buttonsContainer() {
      return document.getElementById("zen-welcome-page-buttons");
    }

    get backButton() {
      return document.getElementById("zen-welcome-back");
    }

    get currentPage() {
      return this.#pages[this.#index];
    }

    get content() {
      return this.#content;
    }

    init() {
      document.getElementById("zen-welcome-start").remove();
      const pages = document.getElementById("zen-welcome-pages");
      pages.style.display = "grid";
      animate(pages, { opacity: [0, 1] }, { ...kFade, duration: 0.45 });
      this.backButton.addEventListener("click", () => this.back());
    }

    next() {
      this.currentPage?.commit?.(this.#content);
      this.#show(this.#index + 1, 1);
    }

    back() {
      if (this.#index <= 0) {
        return;
      }
      this.#show(this.#index - 1, -1);
    }

    #show(index, direction) {
      const previous = this.currentPage;
      while (this.#pages[index]?.skip?.()) {
        index += direction;
      }
      if (index < 0) {
        return;
      }
      this.#index = index;
      const page = this.currentPage;
      if (!page) {
        this.finish();
        return;
      }
      const currentStep = index + 2;
      document.documentElement.setAttribute(
        "zen-welcome-current-step",
        currentStep,
      );
      for (const [stepIndex, step] of document
        .getElementById("zen-welcome-stepper")
        .querySelectorAll("li")
        .entries()) {
        if (stepIndex + 1 === currentStep) {
          step.setAttribute("aria-current", "step");
        } else {
          step.removeAttribute("aria-current");
        }
        step.toggleAttribute("data-complete", stepIndex + 1 < currentStep);
      }
      previous?.leave?.();
      this.#exit(this.textContainer, { x: [0, -80 * direction] });
      this.#exit(this.contentContainer, {});
      this.backButton.toggleAttribute("disabled", index === 0);
      this.updateButtons();
      this.#renderText(page, direction);
      this.#renderContent(page);
    }

    #exit(container, keyframes) {
      for (const element of container.children) {
        if (element.hasAttribute("exiting")) {
          continue;
        }
        element.setAttribute("exiting", "");
        animate(element, { opacity: [1, 0], ...keyframes }, kExit).then(() =>
          element.remove(),
        );
      }
    }

    async #renderText(page, direction) {
      const token = ++this.#renderToken;
      const text = document.createElement("div");
      text.className = "zen-welcome-text";
      const title = document.createElement("h1");
      title.id = "zen-welcome-current-title";
      title.tabIndex = -1;
      document.l10n.setAttributes(title, page.title);
      text.appendChild(title);
      for (const id of page.descriptions ?? []) {
        const p = document.createElement("p");
        document.l10n.setAttributes(p, id);
        text.appendChild(p);
      }
      await document.l10n.translateFragment(text);
      if (token !== this.#renderToken) {
        return;
      }
      this.textContainer.appendChild(text);
      document
        .getElementById("zen-welcome")
        .setAttribute("aria-labelledby", title.id);
      title.focus({ preventScroll: true });
      animate(
        [...text.children],
        { opacity: [0, 1], x: [120 * direction, 0] },
        {
          ...kSpring,
          bounce: 0.4,
          visualDuration: 0.3,
          delay: getMotion().stagger(0.03),
        },
      );
    }

    #renderContent(page) {
      const content = document.createElement("div");
      content.className = "zen-welcome-page";
      if (page.id) {
        content.setAttribute("page", page.id);
      }
      page.render(content, this);
      this.contentContainer.appendChild(content);
      this.#content = content;
      animate(content, { opacity: [0, 1] }, kFade);
    }

    async updateButtons() {
      const token = ++this.#buttonsToken;
      const fragment = document.createDocumentFragment();
      for (const button of this.currentPage.buttons) {
        const element = document.createElement("button");
        if (button.id) {
          element.id = button.id;
        }
        element.className = button.support
          ? "zen-welcome-support"
          : button.primary
            ? "zen-big-accent-button primary"
            : "zen-big-accent-button";
        document.l10n.setAttributes(element, button.l10n);
        element.addEventListener("click", () => {
          if (button.onclick?.(this) !== false) {
            this.next();
          }
        });
        fragment.appendChild(element);
      }
      await document.l10n.translateFragment(fragment);
      if (token === this.#buttonsToken) {
        await this.currentPage.prepareButtons?.(fragment, this.#content);
        this.buttonsContainer.replaceChildren(fragment);
      }
    }

    async finish() {
      ++this.#buttonsToken;
      this.buttonsContainer.replaceChildren();
      this.backButton.toggleAttribute("disabled", true);
      await animate("#zen-welcome", { opacity: [1, 0] });
      this.contentContainer.remove();
      document.getElementById("zen-welcome").remove();
      document.documentElement.removeAttribute("zen-welcome-stage");
      document.documentElement.removeAttribute("zen-welcome-current-step");
      unlockWindowSize();
      for (const element of document.getElementById("browser").children) {
        if (kZenElementsToIgnore.includes(element.id)) {
          continue;
        }
        element.style.removeProperty("opacity");
        element.style.removeProperty("display");
      }
      gZenUIManager.updateTabsToolbar();
      const currentTab = gBrowser.selectedTab;
      gBrowser.selectedTab = gBrowser.addTrustedTab("about:home");
      if (currentTab.linkedBrowser.currentURI.spec === "about:blank") {
        gBrowser.removeTab(currentTab, { animate: false });
      }
    }
  }

  class ZenSearchEngineStore {
    constructor() {
      this._engines = [];
    }

    async init() {
      const visibleEngines = await lazy.SearchService.getVisibleEngines();
      this.initSpecificEngine(visibleEngines);
    }

    getEngines() {
      return this._engines.filter(
        (engine) =>
          !(
            engine.name.toLowerCase().includes("wikipedia") ||
            engine.name.toLowerCase().includes("ebay")
          ),
      );
    }

    initSpecificEngine(engines) {
      for (const engine of engines) {
        try {
          this._engines.push(this._cloneEngine(engine));
        } catch (e) {
          // Ignore engines that throw an exception when cloning.
          console.error(e);
        }
      }
    }

    getEngineByName(aName) {
      return this._engines.find((engine) => engine.name == aName);
    }

    getEngineById(aId) {
      return this._engines.find((engine) => engine.originalEngine.id === aId);
    }

    addEngine(engine) {
      const existing = this.getEngineById(engine.id);
      if (existing) {
        return existing;
      }
      const cloned = this._cloneEngine(engine);
      this._engines.push(cloned);
      return cloned;
    }

    _cloneEngine(aEngine) {
      const clonedObj = {};

      for (const i of ["name", "alias", "_iconURI", "hidden"]) {
        clonedObj[i] = aEngine[i];
      }

      clonedObj.originalEngine = aEngine;

      return clonedObj;
    }

    async getDefaultEngine() {
      let engineName = await lazy.SearchService.getDefault();
      return this.getEngineByName(engineName._name);
    }

    async setDefaultEngine(engine) {
      await lazy.SearchService.setDefault(
        engine.originalEngine,
        lazy.SearchService.CHANGE_REASON.USER,
      );
    }
  }

  function getAppearanceMode() {
    switch (Services.prefs.getIntPref(kSystemThemePref, -1)) {
      case 0:
        return "light";
      case 1:
        return "dark";
      default:
        return "system";
    }
  }

  function canSetDefaultBrowser() {
    return (
      DefaultBrowserHelper.canCheck &&
      Services.policies.isAllowed("setDefaultBrowser") &&
      !Services.prefs.prefIsLocked(
        "pref.general.disable_button.default_browser",
      )
    );
  }

  function setAppearanceMode(mode) {
    if (mode === "system") {
      if (Services.prefs.prefHasUserValue(kSystemThemePref)) {
        Services.prefs.clearUserPref(kSystemThemePref);
      }
      return;
    }
    Services.prefs.setIntPref(kSystemThemePref, mode === "light" ? 0 : 1);
  }

  function getWelcomePages() {
    const kNextButton = { l10n: "zen-welcome-continue", primary: true };
    return [
      {
        id: "search",
        title: "zen-welcome-search-title",
        descriptions: ["zen-welcome-search-description"],
        buttons: [kNextButton],
        async render(content) {
          const engineStore = new ZenSearchEngineStore();
          await engineStore.init();
          const defaultEngine = await lazy.SearchService.getDefault();
          const engineOptions = document.createElement("div");
          engineOptions.className = "zen-welcome-search-engines";
          content.appendChild(engineOptions);
          const appendEngineOption = (engine) => {
            if (
              engineOptions.querySelector(
                `#zen-welcome-engine-${CSS.escape(engine.name.replace(/\s+/g, "-"))}`,
              )
            ) {
              return;
            }
            const iconWrapper = document.createElement("div");
            iconWrapper.className = "engine-icon-wrapper";
            const iconFallback = document.createElement("span");
            iconFallback.className = "engine-icon-fallback";
            iconFallback.textContent = engine.name
              .slice(0, 1)
              .toLocaleUpperCase();
            const iconBackdrop = document.createElement("img");
            iconBackdrop.className = "engine-icon-backdrop";
            iconBackdrop.alt = "";
            const icon = document.createElement("img");
            icon.className = "engine-icon";
            icon.alt = "";
            icon.width = icon.height = 40;
            iconWrapper.append(iconFallback, iconBackdrop, icon);
            icon.addEventListener(
              "load",
              () => iconWrapper.setAttribute("data-icon-loaded", "true"),
              { once: true },
            );
            icon.addEventListener(
              "error",
              () => iconWrapper.setAttribute("data-icon-unavailable", "true"),
              { once: true },
            );
            engine.originalEngine
              .getIconURL(96)
              .then((url) => {
                if (url) {
                  icon.src = url;
                  iconBackdrop.src = url;
                } else {
                  iconWrapper.setAttribute("data-icon-unavailable", "true");
                }
              })
              .catch(() =>
                iconWrapper.setAttribute("data-icon-unavailable", "true"),
              );
            const option = createOption({
              id: "zen-welcome-engine-" + engine.name.replace(/\s+/g, "-"),
              group: "zen-welcome-search-engine",
              text: engine.name,
              checked: engine.name === defaultEngine.name,
              extra: iconWrapper,
            });
            option
              .querySelector("input")
              .addEventListener("change", () =>
                engineStore.setDefaultEngine(engine),
              );
            engineOptions.appendChild(option);
          };
          for (const engine of engineStore.getEngines()) {
            appendEngineOption(engine);
          }

          const searxng = document.createElement("section");
          searxng.className = "zen-welcome-searxng";
          const description = document.createElement("p");
          document.l10n.setAttributes(
            description,
            "zen-welcome-searxng-description",
          );
          const label = document.createElement("label");
          label.htmlFor = "zen-welcome-searxng-url";
          document.l10n.setAttributes(label, "zen-welcome-searxng-url-label");
          const input = document.createElement("input");
          input.id = "zen-welcome-searxng-url";
          input.type = "url";
          input.autocomplete = "url";
          const addButton = document.createElement("button");
          addButton.id = "zen-welcome-searxng-add";
          addButton.type = "button";
          document.l10n.setAttributes(addButton, "zen-welcome-searxng-add");
          const statusElement = document.createElement("p");
          statusElement.id = "zen-welcome-searxng-status";
          statusElement.setAttribute("role", "status");
          statusElement.setAttribute("aria-live", "polite");
          searxng.append(description, label, input, addButton, statusElement);
          content.appendChild(searxng);
          document.l10n.translateElements([description, label, addButton]);

          let pendingHTTPURL = "";
          addButton.addEventListener("click", async () => {
            let instance;
            try {
              instance = new URL(input.value.trim());
            } catch {
              document.l10n.setAttributes(
                statusElement,
                "zen-welcome-searxng-invalid-url",
              );
              return;
            }
            if (
              !["https:", "http:"].includes(instance.protocol) ||
              !instance.hostname ||
              instance.username ||
              instance.password ||
              instance.search ||
              instance.hash
            ) {
              document.l10n.setAttributes(
                statusElement,
                "zen-welcome-searxng-invalid-url",
              );
              return;
            }
            if (
              instance.protocol === "http:" &&
              pendingHTTPURL !== instance.href
            ) {
              pendingHTTPURL = instance.href;
              const local =
                instance.hostname === "localhost" ||
                instance.hostname.endsWith(".localhost") ||
                instance.hostname === "127.0.0.1" ||
                instance.hostname === "[::1]";
              document.l10n.setAttributes(
                statusElement,
                local
                  ? "zen-welcome-searxng-http-local-confirm"
                  : "zen-welcome-searxng-http-confirm",
              );
              return;
            }
            pendingHTTPURL = "";

            const descriptor = new URL(instance.href);
            if (!/\/opensearch\.xml$/i.test(descriptor.pathname)) {
              descriptor.pathname = `${descriptor.pathname.replace(/\/$/, "")}/opensearch.xml`;
            }
            descriptor.searchParams.set("autocomplete", "");
            document.l10n.setAttributes(
              statusElement,
              "zen-welcome-searxng-checking",
            );
            addButton.disabled = true;
            try {
              const service = lazy.SearchService;
              await service.init();
              const storedId = Services.prefs.getStringPref(
                "umbral.search.searxng.engineId",
                "",
              );
              const storedURL = Services.prefs.getStringPref(
                "umbral.search.searxng.openSearchUrl",
                "",
              );
              let engine;
              if (storedId) {
                if (storedURL !== descriptor.href) {
                  throw new Error("edit-in-settings");
                }
                engine = service.getEngineById(storedId);
              }
              if (!engine) {
                engine = await service.addOpenSearchEngine(
                  descriptor.href,
                  null,
                  null,
                );
                const searchURL = engine.getURLOfType("text/html");
                let targetURL;
                try {
                  targetURL = searchURL?.template
                    ? new URL(
                        searchURL.template.replaceAll("{searchTerms}", "test"),
                        descriptor.href,
                      )
                    : null;
                } catch {
                  targetURL = null;
                }
                if (
                  !targetURL ||
                  targetURL.origin !== descriptor.origin ||
                  engine.getURLOfType("application/x-suggestions+json")
                ) {
                  await service.removeEngine(
                    engine,
                    service.CHANGE_REASON.USER,
                  );
                  throw new Error("descriptor-invalid");
                }
                Services.prefs.setStringPref(
                  "umbral.search.searxng.engineId",
                  engine.id,
                );
                Services.prefs.setStringPref(
                  "umbral.search.searxng.openSearchUrl",
                  descriptor.href,
                );
              }
              appendEngineOption(engineStore.addEngine(engine));
              document.l10n.setAttributes(
                statusElement,
                "zen-welcome-searxng-added",
              );
            } catch (error) {
              console.error("Umbral welcome SearXNG setup failed", error);
              let messageId = "zen-welcome-searxng-error";
              if (error.message === "edit-in-settings") {
                messageId = "zen-welcome-searxng-edit-in-settings";
              } else if (error.message === "suggestions-present") {
                messageId = "zen-welcome-searxng-suggestions-error";
              }
              document.l10n.setAttributes(statusElement, messageId);
            } finally {
              addButton.disabled = false;
            }
          });
        },
      },
      {
        id: "theme",
        title: "zen-welcome-theme-title",
        descriptions: ["zen-welcome-theme-description"],
        buttons: [kNextButton],
        render(content) {
          const selectedMode = getAppearanceMode();
          for (const mode of ["light", "dark", "system"]) {
            const preview = document.createElement("span");
            preview.className = "zen-welcome-theme-preview";
            preview.dataset.appearance = mode;
            preview.setAttribute("aria-hidden", "true");
            const option = createOption({
              id: `zen-welcome-theme-${mode}`,
              group: "zen-welcome-theme",
              l10n: `zen-welcome-theme-${mode}`,
              checked: mode === selectedMode,
              extra: preview,
            });
            option.querySelector("input").addEventListener("change", () => {
              setAppearanceMode(mode);
            });
            content.appendChild(option);
          }
        },
      },
      {
        id: "finish",
        title: "zen-welcome-ready-title",
        descriptions: ["zen-welcome-ready-description"],
        buttons: [
          {
            id: "zen-welcome-support",
            l10n: "zen-welcome-support",
            support: true,
            onclick: (pages) => {
              pages.finish().then(() => {
                window.openTrustedLinkIn(
                  "https://ko-fi.com/umbralbrowser",
                  "tab",
                );
              });
              return false;
            },
          },
          {
            id: "zen-welcome-set-default-browser",
            l10n: "zen-welcome-set-default-browser",
            primary: true,
            onclick: (pages) => {
              requestDefaultBrowser(pages.content);
              return false;
            },
          },
          { l10n: "zen-welcome-not-now" },
        ],
        async prepareButtons(buttons, content) {
          const button = buttons.querySelector(
            "#zen-welcome-set-default-browser",
          );
          const statusElement = content.querySelector(
            "#zen-welcome-default-browser-status",
          );
          button.setAttribute("aria-describedby", statusElement.id);
          if (!canSetDefaultBrowser()) {
            button.disabled = true;
            document.l10n.setAttributes(
              statusElement,
              "zen-welcome-default-browser-unavailable",
            );
            await document.l10n.translateElements([statusElement]);
            return;
          }
          try {
            if (DefaultBrowserHelper.isBrowserDefault) {
              button.disabled = true;
              document.l10n.setAttributes(
                button,
                "zen-welcome-default-browser-already",
              );
              document.l10n.setAttributes(
                statusElement,
                "zen-welcome-default-browser-current",
              );
              await document.l10n.translateElements([button, statusElement]);
            }
          } catch (error) {
            console.error("Umbral could not check the default browser", error);
            button.disabled = true;
            document.l10n.setAttributes(
              statusElement,
              "zen-welcome-default-browser-error",
            );
            await document.l10n.translateElements([statusElement]);
          }
        },
        render(content) {
          const aiChoice = document.createElement("section");
          aiChoice.className = "zen-welcome-ai-choice";
          const aiTitle = document.createElement("h2");
          const aiDescription = document.createElement("p");
          document.l10n.setAttributes(aiTitle, "zen-welcome-ai-title");
          document.l10n.setAttributes(
            aiDescription,
            "zen-welcome-ai-description",
          );
          aiChoice.append(aiTitle, aiDescription);
          const aiEnabled = createOption({
            id: "zen-welcome-ai-enable",
            group: "zen-welcome-ai",
            checked: Services.prefs.getBoolPref("umbral.ai.enabled", false),
            l10n: "zen-welcome-ai-enable",
          });
          const aiNotNow = createOption({
            id: "zen-welcome-ai-not-now",
            group: "zen-welcome-ai",
            checked: !Services.prefs.getBoolPref("umbral.ai.enabled", false),
            l10n: "zen-welcome-ai-not-now",
          });
          aiEnabled
            .querySelector("input")
            .addEventListener("change", () =>
              Services.prefs.setBoolPref("umbral.ai.enabled", true),
            );
          aiNotNow
            .querySelector("input")
            .addEventListener("change", () =>
              Services.prefs.setBoolPref("umbral.ai.enabled", false),
            );
          aiChoice.append(aiEnabled, aiNotNow);
          content.appendChild(aiChoice);
          const summary = document.createElement("div");
          summary.className = "zen-welcome-summary";
          for (const [titleId, descriptionId] of [
            [
              "zen-welcome-protection-title",
              "zen-welcome-protection-description",
            ],
            [
              "zen-welcome-containers-title",
              "zen-welcome-containers-description",
            ],
          ]) {
            const item = document.createElement("article");
            const title = document.createElement("h2");
            const description = document.createElement("p");
            document.l10n.setAttributes(title, titleId);
            document.l10n.setAttributes(description, descriptionId);
            item.append(title, description);
            summary.appendChild(item);
          }
          content.appendChild(summary);
          const statusElement = document.createElement("p");
          statusElement.id = "zen-welcome-default-browser-status";
          statusElement.className = "zen-welcome-default-browser-status";
          statusElement.setAttribute("role", "status");
          statusElement.setAttribute("aria-live", "polite");
          content.appendChild(statusElement);
        },
      },
    ];
  }

  async function requestDefaultBrowser(content) {
    const button = document.getElementById("zen-welcome-set-default-browser");
    const statusElement = content.querySelector(
      "#zen-welcome-default-browser-status",
    );
    if (!canSetDefaultBrowser() || button.disabled) {
      return;
    }
    button.disabled = true;
    try {
      if (!button.dataset.checkOnly) {
        await DefaultBrowserHelper.shellSvc.setDefaultBrowser(false);
      }
      if (DefaultBrowserHelper.isBrowserDefault) {
        document.l10n.setAttributes(
          button,
          "zen-welcome-default-browser-already",
        );
        document.l10n.setAttributes(
          statusElement,
          "zen-welcome-default-browser-current",
        );
      } else {
        button.dataset.checkOnly = "true";
        button.disabled = false;
        document.l10n.setAttributes(
          button,
          "zen-welcome-default-browser-check",
        );
        document.l10n.setAttributes(
          statusElement,
          "zen-welcome-default-browser-pending",
        );
      }
    } catch (error) {
      console.error(
        "Umbral could not request the default browser change",
        error,
      );
      button.disabled = false;
      document.l10n.setAttributes(
        statusElement,
        "zen-welcome-default-browser-error",
      );
    }
    await document.l10n.translateElements([button, statusElement]);
  }

  async function animateInitialStage() {
    const button = document.getElementById("zen-welcome-start-button");
    button.addEventListener(
      "click",
      async () => {
        await animate(
          "#zen-welcome-start > *",
          { opacity: [1, 0], y: [0, -12] },
          { duration: 0.2, ease: "easeIn" },
        );
        new nsZenWelcomePages(getWelcomePages());
      },
      { once: true },
    );

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      button.focus({ preventScroll: true });
      return;
    }

    await animate(
      "#zen-welcome-start > *",
      { opacity: [0, 1], y: [18, 0] },
      { delay: getMotion().stagger(0.08), duration: 0.45, ease: "easeOut" },
    );
    button.focus({ preventScroll: true });
  }

  const kSizeLockProperties = [
    "min-width",
    "max-width",
    "min-height",
    "max-height",
  ];

  function lockWindowSize(width, height) {
    const style = document.documentElement.style;
    style.setProperty("min-width", `${width}px`, "important");
    style.setProperty("max-width", `${width}px`, "important");
    style.setProperty("min-height", `${height}px`, "important");
    style.setProperty("max-height", `${height}px`, "important");
  }

  function unlockWindowSize() {
    const style = document.documentElement.style;
    for (const property of kSizeLockProperties) {
      style.removeProperty(property);
    }
  }

  function centerWindowOnScreen() {
    window.addEventListener(
      "MozAfterPaint",
      function () {
        const width = Math.min(1200, screen.availWidth);
        const height = Math.min(720, screen.availHeight);
        window.resizeTo(width, height);
        window.focus();
        const appWin = window.docShell.treeOwner
          .QueryInterface(Ci.nsIInterfaceRequestor)
          .getInterface(Ci.nsIAppWindow);
        appWin.rollupAllPopups();
        window.moveTo(
          screen.availLeft + (screen.availWidth - width) / 2,
          screen.availTop + (screen.availHeight - height) / 2,
        );
        lockWindowSize(width, height);
      },
      { once: true },
    );
  }

  async function startZenWelcome() {
    clearBrowserElements();
    centerWindowOnScreen();
    await initializeZenWelcome();
    animateInitialStage();
  }

  startZenWelcome();
}
