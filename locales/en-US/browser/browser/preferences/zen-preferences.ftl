# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

pane-zen-looks-title = Look and Feel
category-zen-looks =
    .tooltiptext = { pane-zen-looks-title }

zen-warning-language = Changing the default language could make it easier for Websites to track you.

zen-vertical-tabs-layout-header = Browser Layout
zen-vertical-tabs-layout-description = Choose the layout that suits you best

zen-layout-single-toolbar = Only Sidebar
zen-layout-multiple-toolbar = Sidebar and Top Toolbar
zen-layout-collapsed-toolbar = Collapsed Sidebar

zen-glance-title = Glance
zen-glance-header = General settings for glance
zen-glance-description = Get a quick overview of your links without opening them in a new tab
zen-glance-trigger-label = Trigger method
zen-glance-enabled =
    .label = Enable Glance

zen-glance-trigger-ctrl-click =
    .label = { PLATFORM() ->
        [macos] ⌃ + Click
       *[other] Ctrl + Click
    }
    .aria-label = { PLATFORM() ->
        [macos] Control + Click
       *[other] Ctrl + Click
    }
zen-glance-trigger-alt-click =
    .label = { PLATFORM() ->
        [macos] ⌥ + Click
       *[other] Alt + Click
    }
    .aria-label = { PLATFORM() ->
        [macos] Option + Click
       *[other] Alt + Click
    }
zen-glance-trigger-shift-click =
    .label = { PLATFORM() ->
        [macos] ⇧ + Click
       *[other] Shift + Click
    }
    .aria-label = Shift + Click
zen-glance-trigger-meta-click =
    .label = { PLATFORM() ->
        [macos] ⌘ + Click
       *[other] Meta (Command) + Click
    }
    .aria-label = { PLATFORM() ->
        [macos] Command + Click
       *[other] Meta (Command) + Click
    }

zen-look-and-feel-compact-view-header = Show in compact view
zen-look-and-feel-compact-view-description = Only show the toolbars you use!
zen-look-and-feel-compact-view-enabled =
    .label = Enable { -brand-short-name }'s compact mode

zen-look-and-feel-compact-view-top-toolbar =
    .label = Hide the top toolbar as well in compact mode

zen-look-and-feel-compact-toolbar-flash-popup =
    .label = Briefly make the toolbar popup when switching or opening new tabs in compact mode

zen-look-and-feel-window-drag-header = Window dragging
zen-look-and-feel-window-drag-description = Move the window by dragging empty space at the top of websites, just like the titlebar.
zen-window-drag-enabled =
    .label = Allow dragging the window from web pages

pane-zen-tabs-title = Tab Management
category-zen-workspaces =
    .tooltiptext = { pane-zen-tabs-title }
pane-settings-workspaces-title = Workspaces

zen-tabs-select-recently-used-on-close =
    .label = When closing a tab, switch to the most recently used tab instead of the next tab

zen-tabs-close-on-back-with-no-history =
    .label = Close tab and switch to its owner tab (or most recently used tab) when going back with no history

zen-settings-workspaces-sync-unpinned-tabs =
    .label = Sync only pinned tabs in workspaces

zen-tabs-cycle-by-attribute =
  .label = Ctrl+Tab cycles within Essential or Workspace tabs only
zen-tabs-cycle-ignore-pending-tabs =
  .label = Ignore Pending tabs when cycling with Ctrl+Tab
zen-tabs-cycle-by-attribute-warning = Ctrl+Tab will cycle by recently used order, as it is enabled

zen-look-and-feel-compact-toolbar-themed =
    .label = Use themed background for compact toolbar

zen-workspace-continue-where-left-off =
    .label = Continue where you left off

pane-zen-pinned-tab-manager-title = Pinned Tabs
zen-pinned-tab-manager-header = General settings for pinned tabs
zen-pinned-tab-manager-description = Manage additional behavior of pinned tabs
zen-pinned-tab-manager-restore-pinned-tabs-to-pinned-url =
    .label = Restore pinned tabs to their originally pinned URL on startup
zen-pinned-tab-manager-container-specific-essentials-enabled =
    .label = Enable container-specific essentials
zen-pinned-tab-manager-close-shortcut-behavior-label = Close Tab Shortcut Behavior
zen-pinned-tab-manager-reset-unload-switch-close-shortcut-option =
    .label = Reset URL, unload and switch to next tab
zen-pinned-tab-manager-unload-switch-close-shortcut-option =
    .label = Unload and switch to next tab
zen-pinned-tab-manager-reset-switch-close-shortcut-option =
    .label = Reset URL and switch to next tab
zen-pinned-tab-manager-switch-close-shortcut-option =
    .label = Switch to next tab
zen-pinned-tab-manager-reset-close-shortcut-option =
    .label = Reset URL
zen-pinned-tab-manager-close-close-shortcut-option =
    .label = Close tab

pane-zen-workspaces-header = Workspaces
zen-settings-workspaces-header = General settings for workspaces
zen-settings-workspaces-description = With workspaces, you can have multiple browsing sessions at once!
zen-settings-workspaces-enabled =
    .label = Enable Workspaces
zen-settings-workspaces-hide-default-container-indicator =
    .label = Hide the default container indicator in the tab bar

pane-zen-theme-title = Theme Settings

zen-vertical-tabs-title = Sidebar and tabs layout
zen-vertical-tabs-header = Vertical Tabs
zen-vertical-tabs-description = Manage your tabs in a vertical layout
zen-vertical-tabs-show-expand-button =
    .label = Show Expand Button
zen-vertical-tabs-newtab-on-tab-list =
    .label = Show New Tab Button on Tab List
zen-vertical-tabs-newtab-top-button-up =
    .label = Move the new tab button to the top

zen-vertical-tabs-expand-tabs-by-default = Expand Tabs by Default
zen-vertical-tabs-dont-expand-tabs-by-default = Don't Expand Tabs by Default
zen-vertical-tabs-expand-tabs-on-hover = Expand Tabs on Hover (Won't work on compact mode)

zen-vertical-tabs-expand-tabs-header = How to expand tabs
zen-vertical-tabs-expand-tabs-description = Choose how to expand tabs in the sidebar

zen-theme-marketplace-header = Zen Mods
zen-theme-disable-all-enabled =
    .title = Disable all mods
zen-theme-disable-all-disabled =
    .title = Enable all mods
zen-theme-marketplace-description = Find and install mods from the store.
zen-theme-marketplace-remove-button =
    .label = Remove mod
zen-theme-marketplace-check-for-updates-button =
    .label = Check for Updates
zen-theme-marketplace-import-button=
    .label = Import mods
zen-theme-marketplace-export-button =
    .label = Export Mods
zen-theme-marketplace-import-success = Mods imported successfully
zen-theme-marketplace-import-failure = There was an error importing the mods
zen-theme-marketplace-export-success = Mods exported successfully
zen-theme-marketplace-export-failure = There was an error exporting the mods
zen-theme-marketplace-updates-success = Mods updated successfully
zen-theme-marketplace-updates-failure = Couldn't find any updates!
zen-theme-marketplace-toggle-enabled-button =
    .title = Disable mod
zen-theme-marketplace-toggle-disabled-button =
    .title = Enable mod
zen-theme-marketplace-remove-confirmation = Are you sure you want to remove this mod?
zen-theme-marketplace-close-modal = Close
zen-theme-marketplace-theme-header-title =
    .title = CSS Selector: { $name }
zen-theme-marketplace-dropdown-default-label =
    .label = None
zen-theme-marketplace-input-default-placeholder =
    .placeholder = Type something...
pane-zen-marketplace-title = Zen Mods
zen-settings-workspaces-force-container-tabs-to-workspace =
    .label = Switch to workspace where container is set as default when opening container tabs

zen-theme-marketplace-link = Visit Store

zen-dark-theme-styles-header = Dark Theme Styles
zen-dark-theme-styles-description = Customize the dark theme to your liking

zen-dark-theme-styles-amoled = Night Theme
zen-dark-theme-styles-default = Default Dark Theme
zen-dark-theme-styles-colorful = Colorful Dark Theme

zen-compact-mode-styles-left = Hide Tab bar
zen-compact-mode-styles-top = Hide Top bar
zen-compact-mode-styles-both = Hide Both

pane-zen-CKS-title = Keyboard Shortcuts
category-zen-CKS =
    .tooltiptext = { pane-zen-CKS-title }

category-zen-marketplace =
    .tooltiptext = Zen Mods

zenCKSOption-group-zen-workspace = Spaces
zenCKSOption-group-zen-tabs = Tabs
zenCKSOption-group-zen-split-view = Split View
zenCKSOption-group-zen-layout = Layout

zen-text-action-copy-url-shortcut = Copy current URL
zen-text-action-copy-url-markdown-shortcut = Copy current URL as Markdown
zen-toggle-pin-tab-shortcut = Toggle Pin Tab

zen-compact-mode-shortcut-show-sidebar = Toggle Floating Sidebar
zen-compact-mode-shortcut-toggle = Toggle Compact Mode
zen-glance-expand = Expand Glance
zen-workspace-shortcut-switch-1 = Switch to Workspace 1
zen-workspace-shortcut-switch-2 = Switch to Workspace 2
zen-workspace-shortcut-switch-3 = Switch to Workspace 3
zen-workspace-shortcut-switch-4 = Switch to Workspace 4
zen-workspace-shortcut-switch-5 = Switch to Workspace 5
zen-workspace-shortcut-switch-6 = Switch to Workspace 6
zen-workspace-shortcut-switch-7 = Switch to Workspace 7
zen-workspace-shortcut-switch-8 = Switch to Workspace 8
zen-workspace-shortcut-switch-9 = Switch to Workspace 9
zen-workspace-shortcut-switch-10 = Switch to Workspace 10
zen-workspace-shortcut-create = Create New Workspace
zen-sidebar-shortcut-toggle = Toggle Sidebar's Width
zen-library-shortcut-toggle = Toggle Library
zen-pinned-tab-shortcut-reset = Reset Pinned Tab to Pinned URL
zen-split-view-shortcut-grid = Toggle Split View Grid
zen-split-view-shortcut-vertical = Toggle Split View Vertical
zen-split-view-shortcut-horizontal = Toggle Split View Horizontal
zen-split-view-shortcut-unsplit = Close Split View
zen-new-empty-split-view-shortcut = New Empty Split View
zen-close-all-unpinned-tabs-shortcut = Close All Unpinned Tabs
zen-duplicate-tab-shortcut = Duplicate Tab
zen-key-find-selection = Find Selection

umbral-passwords-manager =
    .label = Use Umbral’s password manager
    .description = Controls the built-in manager, including saving and filling. Turning it off keeps stored passwords. External managers are independent.
umbral-passwords-offer =
    .label = Offer to save passwords
    .description = Controls save/update prompts and saving generated passwords. Turning it off does not change autofill or delete saved passwords.
umbral-passwords-autofill =
    .label = Fill usernames and passwords
    .description = Controls automatic filling independently of save offers. Requires the built-in manager to be enabled.
umbral-ai-pane-title = Local AI
umbral-ai-heading = Local AI assistant
umbral-ai-description = Optional and off by default. Configure a local OpenAI-compatible server. Umbral contacts it only when you select Send. Only text in this conversation is sent; no page, browsing history, forms, or other tabs are collected. To share page text, paste the exact text you reviewed.
umbral-ai-endpoint-label = Local server address
umbral-ai-model-label = Model name
umbral-ai-key-label = API key (optional)
umbral-ai-clear-key = Remove the saved API key
umbral-ai-enabled =
    .label = Enable the local assistant
umbral-ai-save = Save settings
umbral-ai-invalid-config = Enter a valid local HTTP or HTTPS address and model name.
umbral-ai-config-saved = Settings saved. The server has not been contacted.
umbral-ai-config-error = Settings could not be saved. Check Firefox password storage settings.
umbral-ai-chat-heading = Conversation
umbral-ai-chat-privacy = Messages are kept only in this page and are not saved as chat history. Each request sends only the text you submit.
umbral-ai-sidebar-toggle = Local AI
    .label = Local AI
    .aria-label = Toggle local AI panel
    .tooltiptext = Toggle local AI panel
umbral-ai-sidebar-title = Local AI
umbral-ai-sidebar-clear =
    .aria-label = Clear conversation
    .tooltiptext = Clear conversation
umbral-ai-sidebar-close =
    .aria-label = Close local AI panel
    .tooltiptext = Close panel
umbral-ai-sidebar-empty-title = How can I help?
umbral-ai-sidebar-empty-text = Start a conversation with your local AI. Your messages stay on your device.
umbral-ai-sidebar-unconfigured-title = Set up your local AI
umbral-ai-prompt-placeholder =
    .placeholder = Write a message…
umbral-ai-sidebar-resize = Resize local AI panel
umbral-ai-sidebar-unconfigured-text = Add a local server and model to start chatting.
umbral-ai-sidebar-configure = Configure local AI
umbral-ai-prompt-label = Message
umbral-ai-send = Send to local server
umbral-ai-request-pending = Waiting for the local server…
umbral-ai-request-error = The request failed. Check that the local server is running and supports the configured API.
umbral-ai-response-error = The server returned an unsupported or oversized response.

zen-searxng-title = SearXNG search instance
zen-searxng-description = Add an instance you trust. Umbral checks it only after you choose Add or update. Searches go only to the selected instance.
zen-searxng-url-label = Instance URL
zen-searxng-add = Add or update instance
zen-searxng-remove = Remove instance
zen-searxng-http-confirm = This instance uses HTTP, so searches and results are not encrypted in transit. If you trust this network and server, press Add or update again to continue.
zen-searxng-http-local-confirm = This local instance uses HTTP. Traffic stays unencrypted on the local network. Press Add or update again to continue.
zen-searxng-checking = Checking the instance…
zen-searxng-added = SearXNG search engine added or updated. Choose it in the default search engine controls above.
zen-searxng-removed = SearXNG search engine removed.
zen-searxng-error = The instance could not be added. Check its URL and OpenSearch support, then try again.
zen-searxng-invalid-url = Enter an HTTPS or HTTP instance URL without credentials, query parameters, or a fragment.
zen-searxng-remove-confirm = This will remove the SearXNG search engine. Press Remove again to confirm.
zen-searxng-remove-active = This engine is a normal or private default. Press Remove again to set DuckDuckGo as the affected default and delete it.
zen-searxng-no-fallback = DuckDuckGo is unavailable. The active engine was not removed.

umbral-ai-api-help = Use the API base address, for example http://127.0.0.1:1234/v1. Umbral appends /chat/completions. A blank key field keeps the saved key.

umbral-ai-cancel = Cancel request
umbral-ai-request-cancelled = Request cancelled.
umbral-ai-request-timeout = The local server did not respond in time.

umbral-support-button = Support Umbral
    .title = Support Umbral
