# Apogee Lab Projects — Frontend v1

Static frontend prototype for:

`projects.apogeelab.org`

This version is intentionally simple and GitHub/Cloudflare-Pages friendly. There is **no backend connected yet**. The purpose of v1 is to finalize the visual structure before creating the Worker, D1 database, R2 image storage, and live admin editing system.

---

## Current file structure

```text
/
├── index.html
├── turbojet.html
├── lightsaber.html
├── rocket.html
├── style.css
├── script.js
├── logo.png
├── favicon.png
├── lightsaber.webp
└── README.md
```

Everything is in the repository root on purpose. No build system, framework, package manager, or nested asset structure is required.

---

## Current frontend behavior

### Projects homepage

`index.html`

The homepage contains:

1. Apogee Lab / Projects header
2. Intro / engineering portfolio hero
3. Featured Micro Turbojet V2 card
4. Custom Lightsaber card
5. Liquid Rocket Engine card
6. Capabilities section
7. Footer with an Admin button

The project cards use the same visual language as the main Apogee Lab homepage, but with more engineering-specific metadata:

- project number
- development status
- discipline tags
- engineering-focused descriptions

### Individual project pages

The current static pages are:

- `turbojet.html`
- `lightsaber.html`
- `rocket.html`

Each project page follows the planned production layout:

```text
Project hero
├── large visual / hero image
└── project information panel
    ├── title
    ├── tags
    ├── about text
    ├── status
    └── metadata

Development Log
├── ★ Latest Version
│   ├── title
│   ├── full text
│   └── image carousel
│
└── Previous Updates
    ├── compact update
    ├── compact update
    └── ...

Gallery
└── all uploaded project images
```

The newest update is intentionally much larger than previous updates.

The long-term rule is:

- newest update = full text + image carousel
- older updates = compact text entries
- images from every update remain available in the gallery

---

# Planned production architecture

The final system is planned as four pieces:

```text
projects.apogeelab.org
        │
        ├── Cloudflare Pages
        │     public frontend
        │
        ├── Projects Worker
        │     API + admin authentication
        │
        ├── D1 database
        │     projects + posts + image metadata
        │
        └── R2 bucket
              project image files
```

The Projects backend will be separate from Replay Trader.

The Projects Worker may use the **same admin password value** as Replay Trader, but it will have its own Cloudflare `ADMIN_PASSWORD` secret and its own admin session cookie.

The public Projects site will **not** be password protected.

---

# Planned admin experience

There will not be a separate admin website.

The footer of the public site contains:

```text
Admin
```

Clicking it will open a login modal on the same page.

After successful authentication, the original public site will enter an editing state.

Example:

```text
PUBLIC

Micro Turbojet V2

Development Log
V2.3 — Diffuser Redesign


ADMIN MODE

Micro Turbojet V2                 [ Edit Project ]

Development Log                   [ + New Update ]

V2.3 — Diffuser Redesign          [ Edit ] [ Delete ]

Gallery                           [ + Upload Images ]
```

The frontend may show or hide controls, but it will **never be responsible for deciding whether an edit is authorized**.

Every create/edit/delete API request must be independently validated by the Worker.

---

# Planned admin authentication

The Projects Worker will use a design similar to Replay Trader's admin authentication.

Planned flow:

```text
Click Admin
    ↓
enter password in modal
    ↓
POST /api/admin/login
    ↓
Worker compares password to ADMIN_PASSWORD secret
    ↓
signed admin session cookie issued
    ↓
frontend checks /api/admin/status
    ↓
editing controls become visible
```

Planned cookie properties:

```text
HttpOnly
Secure
SameSite=Lax
short-lived session (approximately 12 hours)
```

Planned endpoints:

```text
GET  /api/admin/status
POST /api/admin/login
POST /api/admin/logout
```

---

# Planned D1 database

A new Projects D1 database is recommended.

Initial schema concept:

```text
projects
--------
id
slug
name
subtitle
description
status
start_date
hero_image_key
sort_order
created_at
updated_at


project_updates
---------------
id
project_id
title
version_label
body
created_at
updated_at


project_images
--------------
id
project_id
update_id
r2_key
caption
sort_order
created_at
```

The exact schema should be finalized after the frontend fields are settled.

---

# Planned R2 image storage

Actual images should not be stored inside D1.

One R2 bucket will store project media.

Possible bucket name:

```text
apogee-project-images
```

Conceptually:

```text
turbojet/
    compressor-cad.webp
    diffuser-v2.webp
    prototype-test.jpg

lightsaber/
    electronics.webp
    hilt-cad.webp

rocket/
    test-stand.webp
```

D1 stores the image metadata and R2 object key.

R2 stores the actual file.

---

# Planned project API

Public read endpoints:

```text
GET /api/projects
GET /api/projects/:slug
GET /api/projects/:slug/updates
GET /api/projects/:slug/images
```

Admin-only write endpoints:

```text
POST   /api/projects
PUT    /api/projects/:id
DELETE /api/projects/:id

POST   /api/projects/:id/updates
PUT    /api/updates/:id
DELETE /api/updates/:id

POST   /api/projects/:id/images
DELETE /api/images/:id
```

Every write endpoint must validate the admin session on the Worker.

---

# Planned image behavior

When an image is attached to the newest development update:

1. the file is uploaded to R2
2. D1 records the image
3. the image appears in the newest update carousel
4. the image also appears in the full project gallery

When that update becomes old:

- its image carousel is no longer shown in the compact development-log entry
- its images remain in the project gallery

Images are never lost simply because an update is no longer the newest version.

---

# Frontend-to-backend migration plan

## Phase 1 — Frontend prototype

Current phase.

- finalize homepage layout
- finalize project-page layout
- finalize development-log behavior
- finalize gallery behavior
- finalize admin editing UI appearance

No database yet.

## Phase 2 — Backend foundation

Create:

- Projects Worker
- Projects D1
- Projects R2 bucket
- `ADMIN_PASSWORD` Worker secret
- admin-session signing code

## Phase 3 — Public API

Move project information from static HTML into D1.

The frontend will begin loading data from the Worker.

## Phase 4 — Inline admin mode

Connect:

- login modal
- admin status check
- Edit Project
- Add Update
- Edit Update
- Delete Update
- image upload
- image delete
- logout

## Phase 5 — Polish

Possible later additions:

- drag-and-drop gallery ordering
- image captions
- image lightbox
- project filtering
- project archive
- project-specific engineering tags
- resume link
- GitHub links
- automatic thumbnail generation / image compression
- draft posts before publishing

---

# Important design rule

The Projects site is intended to show **engineering process**, not just finished objects.

A project should make it easy to understand:

```text
Problem
↓
Requirements / constraints
↓
Analysis
↓
Design decision
↓
Prototype
↓
Test
↓
Failure / unexpected result
↓
Revision
↓
Current result
```

The development log is therefore part of the engineering portfolio itself, not merely a blog feature.

---

# Deploying this frontend now

This version can already be hosted as a static site.

For a GitHub repository connected to Cloudflare Pages, place all files directly in the repository root and use the normal static Pages deployment.

No build command is required.

The production backend should be added only after the frontend structure is approved.
