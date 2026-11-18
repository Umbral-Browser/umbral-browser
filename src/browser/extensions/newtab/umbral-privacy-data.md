# Umbral homepage privacy data

The two count cards read the Firefox `TrackingDBService` aggregates for
`TRACKERS_ID` and `TRACKING_COOKIES_ID`. Each stored unit is a classified
third-party-origin entry from a content-blocking log, not an ad, network
request, or unique domain. The database stores only category, count, and UTC
date; the homepage receives only the two aggregate numbers.

The counts include the available recorded history of profiles registered with
the current application's toolkit profile service, plus the active profile even
if it is unregistered. The registry is the scope used to identify profiles; it
may include profiles shared with another installation or omit unregistered
profiles. Each distinct registered directory is read once, using only the ETP
database in read-only mode. ETP databases use non-exclusive SQLite locking so
that other running profiles can read committed records safely. Missing databases contribute no records. A failed
read or an outdated profile registry makes the counts unavailable instead of
showing a partial total. Clearing tracking protection data removes the affected
records from subsequent totals. Deleted or unavailable historical records
cannot be recovered.
The `browser.contentblocking.database.enabled` preference must be enabled and
the query must succeed to display counts. An empty successful query is a valid
zero; a disabled source or query error is shown as “No data”.

`WindowGlobalParent.MaybeReportContentBlockingLog` returns before recording
logs from private browsing contexts. The current process flushes its live content-blocking logs before querying.
Other processes are not asked to flush, so their pending events may appear later.
Totals are snapshots of the persisted data, not an atomic cross-profile snapshot. The homepage actor accepts requests only from
`about:home` and `about:newtab`, validates the response schema, and sends no
URLs, domains, history, or tab identifiers to the document.

uBlock Origin remains the original signed XPI. Its AddonManager state is shown
separately; ETP and uBO values are never combined. The homepage refreshes on
initial load and when it becomes visible again. Firefox's database service
offers milestone notifications, not a reliable notification for each new
aggregate row, so no per-event observer or polling is used.
