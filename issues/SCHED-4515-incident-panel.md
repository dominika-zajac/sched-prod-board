---
id: SCHED-4515
title: Ack moves from the row into an incident panel
status: done
plan: R2
---

Product's decision after the step-1 report (recording 00:27: a click meant for INC-5411 acked INC-7784 because
a new incident pushed the rows down as the click landed).

- New incidents stay live at the top (R1 unchanged).
- A row opens its incident panel (`data-testid="incident-panel"`), naming the incident id.
- Ack lives in the panel (`data-testid="panel-ack"`) and acks the incident the panel names. The row-level
  Ack (`data-testid="ack"`) is gone.

Acceptance: a click that lands on a row that slid under the pointer opens a panel naming that incident, so
on-call sees it before acking; the ack always goes to the incident the panel names.
