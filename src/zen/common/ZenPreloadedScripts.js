// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

// prettier-ignore
// eslint-disable-next-line no-lone-blocks
{
  // Search settings are created for every profile, so the file alone is not
  // a user choice. Its absence means the profile has never stored a search
  // default and should receive Umbral's application default. An explicit
  // choice is defaultEngineId inside that file, read later.
  {
    const legacyHome = "chrome://browser/content/umbral-home/home.html";
    if (
      Services.prefs.prefHasUserValue("browser.startup.homepage") &&
      Services.prefs.getStringPref("browser.startup.homepage") === legacyHome
    ) {
      Services.prefs.clearUserPref("browser.startup.homepage");
    }
    const protectPref = "umbral.search.protect-default";
    if (!Services.prefs.getBoolPref(protectPref, false)) {
      const settings = Services.dirsvc.get("ProfD", Ci.nsIFile);
      settings.append("search.json.mozlz4");
      if (!settings.exists()) {
        Services.prefs.setBoolPref(protectPref, true);
        if (!PrivateBrowsingUtils.isWindowPrivate(window)) {
          Services.prefs.setBoolPref(
            "umbral.startup.use-personal-container",
            true
          );
        }
      }
    }
  }

  ChromeUtils.importESModule(
    "chrome://browser/content/UmbralDefaultSearch.sys.mjs",
    { global: "current" }
  );

  ChromeUtils.defineESModuleGetters(this, {
    gZenSpaceRoutingManager:
      "resource:///modules/zen/spacerouting/ZenSpaceRoutingManager.sys.mjs",
  });

  Services.scriptloader.loadSubScript("chrome://browser/content/zen-components/ZenSpaceBookmarksStorage.js", this);

  let scripts = [
    "chrome://browser/content/ZenStartup.mjs",
    "chrome://browser/content/UmbralBrowserChrome.mjs",
    "chrome://browser/content/UmbralLocalAISidebar.sys.mjs",
    "resource:///modules/zen/ZenSpaceManager.mjs",
    "chrome://browser/content/zen-components/ZenCompactMode.mjs",
    "chrome://browser/content/ZenUIManager.mjs",
    "resource:///modules/zen/ZenVerticalTabsManager.mjs",
    "chrome://browser/content/zen-components/ZenMods.mjs",
    "chrome://browser/content/zen-components/ZenSessionStore.mjs",
    "chrome://browser/content/zen-components/ZenGlanceManager.mjs",
    "chrome://browser/content/zen-components/ZenPinnedTabManager.mjs",
    "resource:///modules/zen/ZenTabRenamer.mjs",
    "chrome://browser/content/zen-components/ZenViewSplitter.mjs",
    "chrome://browser/content/zen-components/ZenFolders.mjs",
    "chrome://browser/content/zen-components/ZenEmojiPicker.mjs",
    "chrome://browser/content/zen-components/ZenDownloadAnimation.mjs",
    "resource:///modules/zen/share/ZenShareManager.mjs",
  ];


  let extraOptions = window.arguments?.[1];
  if (
    extraOptions instanceof Ci.nsIPropertyBag2 &&
    extraOptions.hasKey("zen-little-window")
  ) {
    let root = document.documentElement;
    root.setAttribute("zen-little-window", "true");
    if (extraOptions.hasKey("zen-little-window-urlbar-only")) {
      root.setAttribute("zen-little-window-urlbar-only", "true");
    }
    root.setAttribute("persist", "none");
    scripts.push(
      "resource:///modules/zen/littlewindow/ZenLittleWindowChrome.mjs"
    );
  }

  for (let script of scripts) {
    ChromeUtils.importESModule(script, { global: "current" });
  }

  let customZenElements = [
    ["zen-folder", "chrome://browser/content/zen-components/ZenFolder.mjs"],
    ["zen-workspace-creation", "resource:///modules/zen/ZenSpaceCreation.mjs"],
    ["zen-workspace", "resource:///modules/zen/ZenSpace.mjs"],
    ["zen-workspace-icons", "resource:///modules/zen/ZenSpaceIcons.mjs"],
    ["zen-zap-bar", "chrome://browser/content/zen-components/ZenZapBar.mjs"]
  ];

  document.addEventListener(
    "DOMContentLoaded",
    () => {
      // Only sync-import widgets once the document has loaded. If a widget is
      // used before DOMContentLoaded it will be imported and upgraded when
      // registering the customElements.setElementCreationCallback().
      for (let [tag, script] of customZenElements) {
        customElements.setElementCreationCallback(
          tag,
          function customElementCreationCallback() {
            ChromeUtils.importESModule(script, { global: "current" });
          }
        );
      }
    },
    { once: true }
  );

  Services.scriptloader.loadSubScript("chrome://browser/content/zen-components/ZenDragAndDrop.js", this);
}
