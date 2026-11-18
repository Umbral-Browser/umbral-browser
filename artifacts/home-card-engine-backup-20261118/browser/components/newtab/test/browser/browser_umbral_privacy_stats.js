/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { PrivacyMetricsService } = ChromeUtils.importESModule(
  "moz-src:///browser/components/protections/PrivacyMetricsService.sys.mjs"
);

async function readHomepage(browser) {
  return SpecialPowers.spawn(browser, [], () => {
    const text = id =>
      content.document.getElementById(id)?.textContent.trim() ?? null;
    return {
      visibility: content.document.visibilityState,
      trackers: text("umbral-home-trackers-count"),
      cookies: text("umbral-home-cookies-count"),
      status: text("umbral-home-ublock-status"),
      trackerLabel: text("umbral-home-trackers-etp-label"),
      cookieLabel: text("umbral-home-cookies-etp-label"),
      trackerPeriod: text("umbral-home-trackers-period"),
      cookiePeriod: text("umbral-home-cookies-period"),
      trackerTooltip: text("umbral-home-trackers-tooltip"),
      cookieTooltip: text("umbral-home-cookies-tooltip"),
      trackerDescription: content.document
        .getElementById("umbral-home-trackers-info")
        ?.getAttribute("aria-describedby"),
      trackerInfoLabel: content.document
        .getElementById("umbral-home-trackers-info")
        ?.getAttribute("aria-label"),
      cookieDescription: content.document
        .getElementById("umbral-home-cookies-info")
        ?.getAttribute("aria-describedby"),
      trackerValueLabel: content.document
        .getElementById("umbral-home-trackers-count")
        ?.getAttribute("data-l10n-id"),
    };
  });
}

async function openHomepage() {
  const tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, "about:home");
  await TestUtils.waitForCondition(async () => {
    const page = await readHomepage(tab.linkedBrowser);
    return page.status && page.status !== "No data";
  }, "Homepage received its privacy data response");
  return tab;
}

add_task(async function test_umbral_home_displays_firefox_etp_categories() {
  const original = PrivacyMetricsService.getHomepageStats;
  PrivacyMetricsService.getHomepageStats = async () => ({
    trackers: 12,
    cookies: 3,
  });
  try {
    const tab = await openHomepage();
    const page = await readHomepage(tab.linkedBrowser);

    Assert.equal(page.trackers, "12");
    Assert.equal(page.cookies, "3");
    Assert.equal(page.trackerLabel, "Trackers · ETP");
    Assert.equal(page.cookieLabel, "Tracking cookies · ETP");
    Assert.equal(page.trackerPeriod, "Last 7 days");
    Assert.equal(page.cookiePeriod, "Last 7 days");
    Assert.ok(page.trackerTooltip.includes("not ads"));
    Assert.ok(page.trackerTooltip.includes("network requests"));
    Assert.ok(page.trackerTooltip.includes("uBlock Origin"));
    Assert.ok(page.cookieTooltip.includes("uBlock Origin"));
    Assert.equal(page.trackerDescription, "umbral-home-trackers-tooltip");
    Assert.equal(page.cookieDescription, "umbral-home-cookies-tooltip");
    Assert.notEqual(page.trackerValueLabel, "umbral-home-no-data");

    await BrowserTestUtils.removeTab(tab);
  } finally {
    PrivacyMetricsService.getHomepageStats = original;
  }
});

add_task(async function test_umbral_home_displays_valid_zero() {
  const original = PrivacyMetricsService.getHomepageStats;
  PrivacyMetricsService.getHomepageStats = async () => ({
    trackers: 0,
    cookies: 0,
  });
  try {
    const tab = await openHomepage();
    const page = await readHomepage(tab.linkedBrowser);
    Assert.equal(page.trackers, "0");
    Assert.equal(page.cookies, "0");
    await BrowserTestUtils.removeTab(tab);
  } finally {
    PrivacyMetricsService.getHomepageStats = original;
  }
});

add_task(async function test_umbral_home_refreshes_when_visible_again() {
  const original = PrivacyMetricsService.getHomepageStats;
  let trackers = 5;
  PrivacyMetricsService.getHomepageStats = async () => ({
    trackers,
    cookies: 2,
  });
  let homeTab;
  let otherTab;
  try {
    homeTab = await openHomepage();
    is((await readHomepage(homeTab.linkedBrowser)).trackers, "5");

    otherTab = await BrowserTestUtils.openNewForegroundTab(
      gBrowser,
      "about:blank"
    );
    await TestUtils.waitForCondition(async () => {
      return (await readHomepage(homeTab.linkedBrowser)).visibility === "hidden";
    }, "Homepage becomes hidden when another tab is selected");
    trackers = 9;
    gBrowser.selectedTab = homeTab;
    await TestUtils.waitForCondition(async () => {
      return (await readHomepage(homeTab.linkedBrowser)).trackers === "9";
    }, "Homepage refreshes the ETP count when visible again");
  } finally {
    if (otherTab) {
      await BrowserTestUtils.removeTab(otherTab);
    }
    if (homeTab) {
      await BrowserTestUtils.removeTab(homeTab);
    }
    PrivacyMetricsService.getHomepageStats = original;
  }
});

add_task(async function test_umbral_home_shows_no_data_for_source_failure() {
  const original = PrivacyMetricsService.getHomepageStats;
  PrivacyMetricsService.getHomepageStats = async () => {
    throw new Error("controlled ETP database failure");
  };
  try {
    const tab = await openHomepage();
    const page = await readHomepage(tab.linkedBrowser);
    Assert.equal(page.trackers, "No data");
    Assert.equal(page.cookies, "No data");
    await BrowserTestUtils.removeTab(tab);
  } finally {
    PrivacyMetricsService.getHomepageStats = original;
  }
});

add_task(async function test_umbral_home_shows_no_data_when_source_disabled() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.contentblocking.database.enabled", false]],
  });
  try {
    const tab = await openHomepage();
    const page = await readHomepage(tab.linkedBrowser);
    Assert.equal(page.trackers, "No data");
    Assert.equal(page.cookies, "No data");
    await BrowserTestUtils.removeTab(tab);
  } finally {
    await SpecialPowers.popPrefEnv();
  }
});
