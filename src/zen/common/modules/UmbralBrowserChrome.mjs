/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const AUTOHIDE_PREF = "umbral.urlbar.autohide";
const HIDE_DELAY_MS = 180;
const { CustomizableUI: gCustomizableUI } = ChromeUtils.importESModule(
  "moz-src:///browser/components/customizableui/CustomizableUI.sys.mjs"
);

/**
 * Shows the real address bar and bookmarks toolbar over the content area.
 * Zen compact mode keeps its own toolbar hide when that mode is set to hide
 * the toolbar outside the single-toolbar layout.
 */
class UmbralBrowserChrome {
  #hideTimer = 0;
  #draggingBookmarks = false;
  #wired = false;
  #locationListener = false;
  #chromePopupOpen = false;
  #customizableUIListener = null;
  #navBarOrigin = null;
  #welcomeObserver = null;

  init() {
    const wrapper = document.getElementById("zen-appcontent-navbar-wrapper");
    if (!wrapper) {
      return;
    }
    if (this.#wired) {
      this.place();
      return;
    }
    this.#wired = true;
    if (!document.getElementById("umbral-chrome-hotspot")) {
      const hotspot = document.createElement("div");
      hotspot.id = "umbral-chrome-hotspot";
      wrapper.prepend(hotspot);
    }

    const bookmarks = document.getElementById("PersonalToolbar");
    wrapper.addEventListener("mouseenter", () => this.#open());
    wrapper.addEventListener("mouseleave", () => this.#scheduleHide());
    wrapper.addEventListener("focusin", () => this.#open());
    wrapper.addEventListener("focusout", () => this.#scheduleHide());
    bookmarks?.addEventListener("dragstart", () => {
      this.#draggingBookmarks = true;
      this.#open();
    });
    bookmarks?.addEventListener("dragend", () => {
      this.#draggingBookmarks = false;
      this.#scheduleHide();
    });
    const popupBelongsToChrome = event => {
      const popup = event.target;
      const anchor = popup.anchorNode || popup.triggerNode;
      return (
        popup.id === "customizationui-widget-panel" ||
        (!!anchor && wrapper.contains(anchor))
      );
    };
    document.addEventListener(
      "popupshown",
      event => {
        if (popupBelongsToChrome(event)) {
          this.#chromePopupOpen = true;
          this.#open();
        }
      },
      true
    );
    document.addEventListener(
      "popuphidden",
      event => {
        if (!popupBelongsToChrome(event) && !this.#chromePopupOpen) {
          return;
        }
        this.#chromePopupOpen = !!wrapper.querySelector(
          ":is(menupopup, panel)[open]"
        );
        if (!this.#chromePopupOpen) {
          this.#scheduleHide();
        }
      },
      true
    );

    window.addEventListener("TabSelect", () => this.#syncPage());
    document.getElementById("urlbar")?.addEventListener("toggle", event => {
      if (event.newState === "open") {
        this.#open();
        return;
      }
      this.#scheduleHide();
    });
    this.#watchLocations();

    window.addEventListener(
      "keydown",
      event => {
        if (
          event.key.toLowerCase() === "l" &&
          event.ctrlKey &&
          !event.altKey &&
          !event.shiftKey &&
          !event.metaKey
        ) {
          this.#open();
        }
      },
      true
    );

    this.#installControls();
    this.#customizableUIListener = {
      onWidgetAfterCreation: widgetId => {
        if (widgetId?.endsWith("-browser-action")) {
          window.setTimeout(() => this.place(), 0);
        }
      },
      onWidgetAfterDOMChange: node => {
        if (node?.hasAttribute("data-extensionid")) {
          this.place();
        }
      },
      onAreaNodeRegistered: area => {
        if (area === "nav-bar") {
          this.place();
        }
      },
    };
    gCustomizableUI.addListener(this.#customizableUIListener);
    this.place();
    const { AddonManager } = ChromeUtils.importESModule(
      "resource://gre/modules/AddonManager.sys.mjs"
    );
    AddonManager.getAllAddons().then(() => {
      window.setTimeout(() => {
        if (!window.closed) {
          this.place();
        }
      }, 2000);
    });
    const refreshAfterStartup = subject => {
      if (subject !== window) {
        return;
      }
      Services.obs.removeObserver(
        refreshAfterStartup,
        "browser-delayed-startup-finished"
      );
      this.place();
    };
    if (window.gBrowserInit?.delayedStartupFinished) {
      this.place();
    } else {
      Services.obs.addObserver(
        refreshAfterStartup,
        "browser-delayed-startup-finished"
      );
    }
    // During the welcome flow Firefox computes toolbar overflow while the
    // toolbox is hidden. Recompute once the welcome stage is removed, then
    // let the native overflow manager settle before routing extension actions.
    const refreshExtensionPlacement = () => {
      window.requestAnimationFrame(() =>
        window.requestAnimationFrame(() => {
          if (window.closed) return;
          // The welcome completion animation restores the toolbox and window
          // geometry at the same time. Give those styles a moment to settle.
          window.setTimeout(() => {
            if (window.closed) return;
            window.dispatchEvent(new Event("resize"));
            window.setTimeout(() => this.place(), 350);
          }, 350);
        })
      );
    };
    this.#welcomeObserver = new MutationObserver(() => {
      if (document.documentElement.hasAttribute("zen-welcome-stage")) {
        return;
      }
      this.#welcomeObserver?.disconnect();
      this.#welcomeObserver = null;
      refreshExtensionPlacement();
    });
    this.#welcomeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["zen-welcome-stage"],
    });
    if (!document.documentElement.hasAttribute("zen-welcome-stage")) {
      window.setTimeout(refreshExtensionPlacement, 2000);
    }
    this.#syncPage();

    const modeObserver = new MutationObserver(() => this.place());
    modeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["zen-compact-mode", "zen-single-toolbar"],
    });
    Services.prefs.addObserver(AUTOHIDE_PREF, this);
    Services.prefs.addObserver("zen.view.compact.hide-toolbar", this);
    window.addEventListener(
      "unload",
      () => {
        modeObserver.disconnect();
        this.#welcomeObserver?.disconnect();
        if (this.#customizableUIListener) {
          gCustomizableUI.removeListener(this.#customizableUIListener);
        }
        Services.prefs.removeObserver(AUTOHIDE_PREF, this);
        Services.prefs.removeObserver("zen.view.compact.hide-toolbar", this);
        window.clearTimeout(this.#hideTimer);
      },
      { once: true }
    );
  }

  observe() {
    this.place();
  }

  restoreNavBarForCustomization() {
    const nav = document.getElementById("nav-bar");
    const toolbox = document.getElementById("navigator-toolbox");
    if (!nav || !toolbox || nav.parentElement === toolbox) {
      return;
    }
    this.#navBarOrigin = {
      parent: nav.parentElement,
      nextSibling: nav.nextSibling,
    };
    const bookmarks = document.getElementById("PersonalToolbar");
    toolbox.insertBefore(
      nav,
      bookmarks?.parentElement === toolbox ? bookmarks : null
    );
    this.#syncMode();
  }

  returnNavBarAfterCustomization() {
    const nav = document.getElementById("nav-bar");
    const { parent, nextSibling } = this.#navBarOrigin || {};
    if (nav && parent?.isConnected && nav.parentElement !== parent) {
      parent.insertBefore(
        nav,
        nextSibling?.parentElement === parent ? nextSibling : null
      );
    }
    this.#navBarOrigin = null;
    window.setTimeout(() => this.place(), 0);
  }

  /**
   * Puts the real address bar and bookmarks over the content column after
   * Zen has finished its own toolbar layout.
   */
  place() {
    if (document.documentElement.hasAttribute("customizing") || this.#zenOwnsToolbarHide()) {
      this.#syncMode();
      return;
    }
    const container = document.getElementById("zen-appcontent-navbar-container");
    const nav = document.getElementById("nav-bar");
    const bookmarks = document.getElementById("PersonalToolbar");
    const target = document.getElementById("nav-bar-customization-target");
    const overflowButton = document.getElementById("nav-bar-overflow-button");
    const urlbar = document.getElementById("urlbar-container");
    if (container && nav) {
      if (bookmarks?.parentElement === container) {
        container.insertBefore(nav, bookmarks);
      } else if (nav.parentElement !== container) {
        container.appendChild(nav);
      }
      if (overflowButton && overflowButton.parentElement !== nav) {
        nav.appendChild(overflowButton);
      }
    }
    if (target && urlbar) {
      for (const id of ["back-button", "forward-button", "stop-reload-button"]) {
        const button = document.getElementById(id);
        if (button) {
          target.insertBefore(button, urlbar);
        }
      }
      if (gCustomizableUI) {
        let navbarWidgets = null;
        try {
          navbarWidgets = new Set(
            gCustomizableUI.getWidgetIdsInArea("nav-bar")
          );
        } catch (error) {
          if (!error.message?.includes("Area nav-bar not yet restored")) {
            throw error;
          }
        }
        if (navbarWidgets) {
          const isOverflowed = node =>
            node?.closest(
              "#widget-overflow-list, #overflowed-extensions-list, #zen-overflow-extensions-list"
            );
          for (const widgetId of navbarWidgets) {
            if (!widgetId.endsWith("-browser-action")) {
              continue;
            }
            const action = gCustomizableUI
              .getWidget(widgetId)
              ?.forWindow(window).node;
            if (
              action?.hasAttribute("data-extensionid") &&
              !isOverflowed(action) &&
              !target.contains(action)
            ) {
              target.appendChild(action);
            }
          }
          for (const sourceId of [
            "zen-sidebar-top-buttons-customization-target",
            "page-action-buttons",
          ]) {
            const source = document.getElementById(sourceId);
            for (const button of
              source?.querySelectorAll("[data-extensionid]") || []) {
              if (navbarWidgets.has(button.id) && !isOverflowed(button)) {
                target.appendChild(button);
              }
            }
          }
          const pageActions = document.getElementById("page-action-buttons");
          for (const button of
            pageActions?.parentElement?.querySelectorAll(
              ":scope > [data-extensionid]"
            ) || []) {
            if (navbarWidgets.has(button.id) && !isOverflowed(button)) {
              target.appendChild(button);
            }
          }
        }
      }
      for (const id of ["unified-extensions-button", "PanelUI-button"]) {
        const button = document.getElementById(id);
        if (button) {
          target.appendChild(button);
        }
      }
    }
    this.#watchLocations();
    const windowButtons = container?.querySelector(":scope > .titlebar-buttonbox-container");
    if (windowButtons && nav) {
      nav.appendChild(windowButtons);
    }
    this.#installControls();
    this.#syncMode();
    if (window.gBrowser) {
      this.#syncPage();
    }
  }

  #watchLocations() {
    if (this.#locationListener || !window.gBrowser) {
      return;
    }
    this.#locationListener = true;
    gBrowser.addProgressListener({
      onLocationChange: webProgress => {
        if (webProgress && !webProgress.isTopLevel) {
          return;
        }
        this.#syncPage();
      },
    });
  }

  #installControls() {
    const menu = document.getElementById("toolbar-context-menu");
    if (menu && !document.getElementById("umbral-context-urlbar-autohide")) {
      const item = document.createXULElement("menuitem");
      item.id = "umbral-context-urlbar-autohide";
      item.setAttribute("type", "checkbox");
      item.setAttribute("data-l10n-id", "umbral-toolbar-context-autohide-urlbar");
      item.addEventListener("command", () => {
        Services.prefs.setBoolPref(AUTOHIDE_PREF, item.getAttribute("checked") === "true");
        this.#syncMode();
      });
      menu.addEventListener("popupshowing", () => {
        item.setAttribute(
          "checked",
          Services.prefs.getBoolPref(AUTOHIDE_PREF, false) ? "true" : "false"
        );
      });
      menu.appendChild(item);
      document.l10n?.translateElements([item]);
    }

    const keyset = document.getElementById("mainKeyset");
    if (keyset && !document.getElementById("umbral-focus-bookmarks-key")) {
      const key = document.createXULElement("key");
      key.id = "umbral-focus-bookmarks-key";
      key.setAttribute("key", "B");
      key.setAttribute("modifiers", "alt,shift");
      key.setAttribute("data-l10n-id", "umbral-focus-bookmarks-key");
      key.addEventListener("command", () => this.#focusBookmarks());
      keyset.appendChild(key);
      document.l10n?.translateElements([key]);
    }
  }

  #zenOwnsToolbarHide() {
    return (
      document.documentElement.getAttribute("zen-compact-mode") === "true" &&
      document.documentElement.getAttribute("zen-single-toolbar") !== "true" &&
      Services.prefs.getBoolPref("zen.view.compact.hide-toolbar", false)
    );
  }

  #syncMode() {
    const root = document.documentElement;
    if (this.#zenOwnsToolbarHide()) {
      root.removeAttribute("umbral-browser-chrome");
      root.removeAttribute("umbral-urlbar-autohide");
      return;
    }
    root.setAttribute("umbral-browser-chrome", "true");
    if (Services.prefs.getBoolPref(AUTOHIDE_PREF, false)) {
      root.setAttribute("umbral-urlbar-autohide", "true");
    } else {
      root.removeAttribute("umbral-urlbar-autohide");
    }
  }

  #normalizedSpec(uri) {
    if (!uri) {
      return "";
    }
    let spec = "";
    try {
      spec = uri.specIgnoringRef || uri.spec || "";
    } catch (error) {
      return "";
    }
    if (uri.scheme === "about") {
      const query = spec.indexOf("?");
      return query >= 0 ? spec.slice(0, query) : spec;
    }
    if ((uri.scheme === "http" || uri.scheme === "https") && spec.endsWith("/")) {
      spec = spec.slice(0, -1);
    }
    return spec;
  }

  #onHomepage() {
    if (!window.gBrowser?.selectedBrowser) {
      return false;
    }
    const uri = gBrowser.selectedBrowser.currentURI;
    const spec = this.#normalizedSpec(uri);
    let homepage = "about:home";
    try {
      homepage = window.HomePage?.get(window) || Services.prefs.getStringPref(
        "browser.startup.homepage",
        homepage
      );
    } catch (error) {
      homepage = "about:home";
    }
    const specs = new Set(
      homepage
        .split("|")
        .map(part => part.trim())
        .filter(Boolean)
    );
    if (specs.has("about:home") || specs.has("about:newtab")) {
      specs.add("about:home");
      specs.add("about:newtab");
    }
    return specs.has(spec);
  }

  #syncPage() {
    const root = document.documentElement;
    const wrapper = document.getElementById("zen-appcontent-navbar-wrapper");
    if (this.#onHomepage()) {
      root.setAttribute("umbral-on-home", "true");
      return;
    }
    root.removeAttribute("umbral-on-home");
    if (wrapper && !this.#busy() && !wrapper.matches(":hover")) {
      wrapper.removeAttribute("umbral-chrome-open");
    }
  }

  #busy() {
    const wrapper = document.getElementById("zen-appcontent-navbar-wrapper");
    if (!wrapper) {
      return false;
    }
    if (this.#draggingBookmarks || wrapper.matches(":focus-within")) {
      return true;
    }
    if (
      gURLBar?.focused ||
      gURLBar?.view?.isOpen ||
      gURLBar?.matches(":popover-open") ||
      gURLBar?.hasAttribute("open") ||
      gURLBar?.hasAttribute("breakout-extend")
    ) {
      return true;
    }
    return this.#chromePopupOpen || !!wrapper.querySelector("[open], [panelopen]");
  }

  #open() {
    window.clearTimeout(this.#hideTimer);
    document
      .getElementById("zen-appcontent-navbar-wrapper")
      ?.setAttribute("umbral-chrome-open", "true");
  }

  #scheduleHide() {
    window.clearTimeout(this.#hideTimer);
    this.#hideTimer = window.setTimeout(() => {
      if (this.#busy() || this.#onHomepage()) {
        return;
      }
      document
        .getElementById("zen-appcontent-navbar-wrapper")
        ?.removeAttribute("umbral-chrome-open");
    }, HIDE_DELAY_MS);
  }

  #focusBookmarks() {
    this.#open();
    const first = document.querySelector("#PlacesToolbarItems .bookmark-item");
    if (first) {
      first.focus();
      return;
    }
    document.getElementById("PersonalToolbar")?.focus();
  }
}

window.gUmbralBrowserChrome = new UmbralBrowserChrome();
window.addEventListener(
  "customizationstarting",
  () =>
    window.setTimeout(
      () => window.gUmbralBrowserChrome?.restoreNavBarForCustomization(),
      0
    )
);
window.addEventListener(
  "customizationending",
  () =>
    window.setTimeout(
      () => window.gUmbralBrowserChrome?.returnNavBarAfterCustomization(),
      0
    )
);

window.addEventListener(
  "MozBeforeInitialXULLayout",
  () => {
    gUmbralBrowserChrome.init();
  },
  { once: true }
);
