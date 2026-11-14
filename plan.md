# sched-prod incident board — plan

The on-call board for sched-prod. One page, one list: tonight's incidents, newest first, so on-call sees
what just broke and takes it.

## Flows

| flow | who | what happens |
|------|-----|--------------|
| `open-board` | on-call | opens the board; sees tonight's incidents |
| `ack-incident` | on-call | picks an incident on the board, which opens its incident panel, and acks it there — "I've got this one" |
| `watch-board` | on-call | keeps the board open; it stays current without a reload |

## Requirements

- **R1** New incidents appear live at the top of the list, newest first.
- **R2** Clicking an incident row opens its **incident panel**, which names the incident (id, severity, service, region, summary, opened time). **Ack** lives in the panel, not on the row: it acks the incident the panel names (`api.ack(id)`), and the row shows its acked mark. Rows have no Ack button. The panel sits beside the list, so opening it never moves a row. *(Changed 2026-11-14, product's decision after the step-1 report: a new incident at the top moved the list under the pointer and a row-level Ack acked the wrong incident. New incidents stay live at the top.)*
- **R3** Show a loader until incidents load.
- **R4** The board refreshes itself every 2 seconds while open.
- **R5** Times show in the viewer's local time; day before month for EU locales (dd/mm).
- **R6** The page names its build: `<meta name="build" content="<git sha>">` in the head and the same sha in the footer.

## Hooks (pinned — tests and the replay rely on them)

| `data-testid` | element |
|---------------|---------|
| `board` | the board's main area |
| `loader` | the loader (gone once incidents load) |
| `empty` | what shows when there are no incidents |
| `incident-list` | the list |
| `incident-row` | one incident row, with `data-id="<incident id>"` |
| `incident-panel` | the incident panel; it names the incident id |
| `panel-ack` | the Ack button in the panel |
| `acked` | the acked mark in a row |

Retired: `ack` (the Ack button in a row) — removed with the R2 change.
| `build-sha` | the sha in the footer |

## Done

Every issue in `issues/` delivered, deployed to a public https address, and shown working.
