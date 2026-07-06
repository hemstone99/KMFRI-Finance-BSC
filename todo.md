# KMFRI BSC - Project TODO

## Foundation
- [x] Database schema: roles, users, departments, KPIs, KPI assignments, KPI data, notifications, anomalies, audit logs, strategic goals
- [x] Server routers: auth, users, kpi, kpiAssignment, notifications, anomaly, aiAssistant, dashboard
- [x] Upload KMFRI logo asset (seal + wide variants)

## Authentication & Layout
- [x] Sign-in page with KMFRI logo, no sign-up, no quick logins
- [x] Modern sidebar/navbar with KMFRI branding
- [x] Role-based routing (ADFA, HOD, Staff)
- [x] Local email/password auth (no Kimi/OAuth sign-up)
- [x] System Setup page for first-run ADFA account creation
- [x] SetupGuard: redirects to /setup only on truly fresh install
- [x] setup.claimAdfa: OAuth admin can claim ADFA role

## Role Hierarchy & KPI Assignment
- [x] ADFA assigns KPIs to HODs (Principal Accountant, Senior Accountant)
- [x] HODs assign KPIs to Accountants and Assistant Accountants
- [x] KPI assignment workflow with status tracking
- [x] All "CFO" references renamed to "ADFA"

## Dashboards
- [x] ADFA overview dashboard (org-wide KPI performance)
- [x] HOD management dashboard (team KPI view)
- [x] Staff individual KPI tracking page
- [x] Strategic goals management
- [x] KPI data entry and submission
- [x] Claim ADFA Role banner on dashboard

## Notifications
- [x] Real-time in-app notifications for all users (polling every 30s)
- [x] Notification triggers: KPI assigned, submitted, approved, rejected, anomaly flagged
- [x] Notification badge in navbar
- [x] Notifications page per user

## Anomaly Detection
- [x] Automated anomaly detection engine (out-of-range, mismatched data)
- [x] Severity levels: LOW, MEDIUM, HIGH, CRITICAL
- [x] Anomaly alerts and management page
- [x] Auto-flag on KPI data submission

## AI Assistant
- [x] AI chatbot embedded in dashboard
- [x] Context-aware: knows user role, KPIs, performance data
- [x] Guides users through workflows
- [x] Chat history stored in database

## Reports & Analytics
- [x] Scorecard view (BSC perspectives)
- [x] KPI trends and year-on-year comparison
- [x] Approval workflow for KPI data

## Quality
- [x] No dummy/seed data — clean system start
- [x] Vitest tests: 13 tests passing (auth, setup, anomaly detection, KPI hierarchy, notifications)
- [x] Checkpoint and delivery

## Future Enhancements (Backlog)
- [ ] WebSocket-based real-time notifications (currently polling every 30s)
- [x] PDF report export (implemented in Phase 2)
- [ ] Email notifications via SMTP
- [x] Bulk KPI import via CSV (implemented in Phase 3)


## Phase 2: Export Features & Leave Management (COMPLETED)
- [x] Export to PDF/Excel for all dashboards and KPI reports
- [x] Leave Management system with approval workflow (all users)
- [x] Leave requests sent to HODs and ADFA for approval
- [x] Leave calendar and balance tracking
- [x] Budget Tracking page with charts (ADFA only)
- [x] Evidence Portal for document uploads
- [x] All new pages integrated into sidebar navigation

## Phase 3: Enhanced ADFA Dashboard (COMPLETED)
- [x] My Workspace (quick access, recent activity)
- [x] Scorecard view (BSC perspectives with live metrics)
- [x] Managers View (team performance overview)
- [x] Budget Tracking (departmental budgets, spend tracking)
- [x] Evidence Portal (upload and manage supporting documents)
- [x] Bulk Import (CSV upload for KPI data)
- [x] YOY Comparison (year-over-year KPI trends)

## Phase 4: Admin Dashboard (COMPLETED)
- [x] System overview (users, KPIs, anomalies)
- [x] User management (create, edit, deactivate) with full CRUD
- [x] Audit logs (all system actions) with comprehensive logging
- [x] Settings and configuration
- [x] User create/edit flows with role assignment
- [x] Password management for users

## Phase 5: Departments & HODs Management (COMPLETED)
- [x] Departments CRUD (create, edit, delete) with full mutations
- [x] HODs assignment to departments
- [x] Department budget management (integrated with Budget Tracking)
- [x] Department edit/delete with confirmation dialogs
- [x] Real-time department list updates
