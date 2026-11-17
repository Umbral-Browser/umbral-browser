/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

function toolbarItemForGuid(guid) {
  return [...document.getElementById("PlacesToolbarItems").children].find(
    item => item._placesNode?.bookmarkGuid === guid
  );
}

async function waitForToolbarItem(guid, expected) {
  await TestUtils.waitForCondition(
    () => Boolean(toolbarItemForGuid(guid)) === expected,
    `Toolbar item ${guid} should ${expected ? "appear" : "disappear"}`
  );
}

add_task(async function test_toolbar_tracks_places_changes_live() {
  await gZenWorkspaces.promiseInitialized;
  const toolbar = document.getElementById("PlacesToolbar");
  await toolbar?._placesView?.promiseRebuilt();

  const bookmark = await PlacesUtils.bookmarks.insert({
    parentGuid: PlacesUtils.bookmarks.toolbarGuid,
    title: "Live toolbar bookmark",
    url: "https://example.com/",
  });
  registerCleanupFunction(async () => {
    if (await PlacesUtils.bookmarks.fetch(bookmark.guid)) {
      await PlacesUtils.bookmarks.remove(bookmark.guid);
    }
  });
  await waitForToolbarItem(bookmark.guid, true);

  // Compete a workspace refresh with normal Places notifications. The refresh
  // must settle before the native view is considered current.
  await Promise.all([
    PlacesUtils.bookmarks.update({
      guid: bookmark.guid,
      title: "Renamed live bookmark",
    }),
    gZenWorkspaces._invalidateBookmarkContainers(),
  ]);
  await toolbar?._placesView?.promiseRebuilt();
  Assert.equal(
    toolbarItemForGuid(bookmark.guid)?._placesNode.title,
    "Renamed live bookmark",
    "Title edits are reflected in the toolbar"
  );

  const originalWorkspace = gZenWorkspaces.getActiveWorkspace();
  const otherWorkspace = await gZenWorkspaces.createAndSaveWorkspace(
    "Bookmark refresh test"
  );
  registerCleanupFunction(() =>
    gZenWorkspaces.removeWorkspace(otherWorkspace.uuid)
  );
  await gZenWorkspaces.changeWorkspace(otherWorkspace);
  await waitForToolbarItem(bookmark.guid, true);
  await gZenWorkspaces.changeWorkspace(originalWorkspace);
  await waitForToolbarItem(bookmark.guid, true);

  await PlacesUtils.bookmarks.update({
    guid: bookmark.guid,
    parentGuid: PlacesUtils.bookmarks.unfiledGuid,
    index: PlacesUtils.bookmarks.DEFAULT_INDEX,
  });
  await waitForToolbarItem(bookmark.guid, false);

  await PlacesUtils.bookmarks.update({
    guid: bookmark.guid,
    parentGuid: PlacesUtils.bookmarks.toolbarGuid,
    index: PlacesUtils.bookmarks.DEFAULT_INDEX,
  });
  await waitForToolbarItem(bookmark.guid, true);

  await PlacesUtils.bookmarks.remove(bookmark);
  await waitForToolbarItem(bookmark.guid, false);
});
