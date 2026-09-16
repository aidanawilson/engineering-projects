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


---

# Frontend v2 homepage decisions

The Projects homepage is now intentionally **tile-first**.

There is no large hero/title section. The sticky site header is the only top-level introduction, and the project cards begin immediately underneath it.

Desktop target:

```text
[ Apogee Lab / Projects header ]

[ Turbojet ] [ Lightsaber ] [ Rocket ]

...additional project cards...
```

The cards are intentionally shorter than the original v1 cards and use smaller titles positioned slightly above the vertical center. The goal is that a typical desktop visitor can immediately see the names of at least three projects without scrolling.

---

# Dynamic project tile image rule

This is now a required backend behavior.

For every project:

```text
Newest project update
        ↓
photos attached to update
        ↓
first photo in update order
        ↓
AUTOMATIC PROJECT TILE BACKGROUND
```

Example:

```text
Turbojet V2.4 update

1. compressor-test.jpg
2. diffuser-cad.webp
3. assembly.jpg
```

The tile for Turbojet automatically uses:

```text
compressor-test.jpg
```

If a newer update is published:

```text
Turbojet V2.5 update

1. running-engine.jpg
2. nozzle-test.jpg
```

the tile automatically changes to:

```text
running-engine.jpg
```

No separate manual "tile image" upload should be required for normal use.

Possible fallback hierarchy:

```text
1. first image on newest update
2. project's manually selected fallback/hero image
3. generated/default project placeholder
```

The backend should therefore preserve **image ordering inside each update**.

The `project_images` table should include a sort-order field.

Recommended query concept:

```text
latest update for project
    → first image by sort_order
    → use as tile image
```

---

# Adding a completely new project

Admin mode will eventually include:

```text
+ Add New Project
```

on the Projects homepage.

This is already represented in the v2 frontend as a hidden admin-only control.

After the backend is connected, clicking it should open a project editor with fields such as:

```text
Project name
Slug
Short homepage description
Full about text
Status
Start date
Tags / disciplines
Initial hero/fallback image
Sort order
```

Publishing the project creates a new row in the shared `projects` table.

A new project does **not** require:

- a new D1 database
- a new Worker
- a new table set
- new source-code page files

The site is planned around one Projects database containing all projects.

Conceptually:

```text
projects
--------
1  micro-turbojet-v2
2  custom-lightsaber
3  liquid-rocket-engine
4  future-project
5  future-project
...
```

Related tables use `project_id` to associate their content with the correct project.

```text
project_updates
---------------
id
project_id
...

project_images
--------------
id
project_id
update_id
...
```

This means the admin interface can create an unlimited number of projects using the same database structure.

---

# Important production change from the current static prototype

The current v2 repo still contains:

```text
turbojet.html
lightsaber.html
rocket.html
```

because the backend does not exist yet.

Once the dynamic backend is implemented, individual hard-coded HTML project files should no longer be required.

A production approach may use a single reusable page such as:

```text
project.html?slug=micro-turbojet-v2
```

or route-based handling such as:

```text
projects.apogeelab.org/project/micro-turbojet-v2
```

The frontend will fetch the correct project record from the Projects API and render the same reusable page template.

That is what makes "+ Add New Project" possible without editing GitHub every time.


---

# Frontend v3 homepage layout

The uploaded visual reference is now the homepage target.

The homepage hierarchy is:

```text
Sticky site header

Projects          short explanation

[      featured project / flagship      ]

[ second project ] [ third project ]

[ additional projects continue below ]
```

The homepage intentionally does **not** have a hero section.

The featured project is larger, but the title is positioned so that the second row is already entering the viewport on a typical desktop display. This lets visitors immediately understand that the site contains multiple projects.

The current static prototype still uses a generated visual for Turbojet and a real uploaded image for Lightsaber. In production, these card backgrounds will come from the first photo of the project's latest update.


---

# Frontend v4 interaction decisions

## Equal-height homepage project tiles

All homepage project cards now use the same vertical height.

The flagship project remains full-width, but its importance is communicated through width and placement instead of a taller card.

The intended first-screen behavior is:

```text
Header
Compact Projects intro
[ full first project tile ]

[ approximately the upper portion of the next row is visible ]
```

This makes it visually obvious that the portfolio continues below without requiring a separate scroll indicator on the homepage.

## Project-page scroll cue

Individual project pages now include an explicit cue below the hero/about area:

```text
↓  DEVELOPMENT LOG
```

The cue:

- is centered below the initial project hero
- subtly animates downward
- can be clicked
- smooth-scrolls directly to the Development Log section

The project hero was also shortened slightly so that the page does not feel like a self-contained landing screen. The goal is for visitors to understand immediately that the hero is only the beginning of the project documentation.


---

# Frontend v5 admin-editing requirements

## Larger project-page scroll cue

The Development Log scroll cue on project pages is now intentionally prominent:

```text
        ↓
DEVELOPMENT LOG
```

The circular arrow is roughly twice the previous size so visitors are much less likely to mistake the hero/about block for the entire project page.

---

# Editable project fields

The future admin system must allow an existing project to be edited in place.

Editing is not limited to changing status or adding updates. The administrator must be able to correct typos or revise any public-facing project metadata without touching source code.

Minimum editable project fields:

```text
Project title
Homepage / tile description
Full project-page About description
Project status
Tags / disciplines
Sort order
Fallback / hero image if needed
Slug, with safeguards
```

The homepage description and full About description are separate fields.

Example:

```text
Homepage description
--------------------
Short, 1–3 sentence summary designed to fit cleanly on a tile.


Full About description
----------------------
Longer explanation shown inside the project's detail page.
```

---

# Project status

Status must be editable from the project editor.

Initial status vocabulary:

```text
In Development
Proof of Concept
Prototype
Functional Prototype
Complete
Team Project
Paused
Archived
```

This list can be changed later if needed.

The status value controls the status pill shown on the project tile and inside the project page.

The database should store status as data rather than baking the words into HTML.

---

# Admin project editor

Once authenticated, every project detail page should expose:

```text
[ Edit Project ]   [ + New Update ]
```

`Edit Project` should open an inline modal/editor containing all editable project fields.

Saving should update the existing D1 project row.

It should **not** create a replacement project just because text was edited.

That distinction matters for keeping:

```text
project_id
updates
images
gallery
URLs
```

attached to the same project over its lifetime.

---

# Add New Project

The Projects homepage should expose this only in authenticated admin mode:

```text
+ Add New Project
```

Required creation fields in the first backend version:

```text
Project title
Project status
Homepage description
Full About description
Tags / disciplines
```

Additional fields such as slug, start date, sort order, and fallback image may be generated automatically or exposed in an advanced section.

Creating a project inserts one new row into the single shared Projects D1 database.

No new database, Worker, or schema is created per project.

---

# Frontend-only admin preview

Before the backend exists, the static frontend includes a hidden admin-interface preview.

To inspect it locally or on a test deployment, append:

```text
?admin=preview
```

For example:

```text
projects.apogeelab.org/?admin=preview
projects.apogeelab.org/turbojet.html?admin=preview
```

This only reveals the prototype editing controls.

It does **not** authenticate, write data, or persist changes.

When the Worker is implemented, this preview mechanism should be removed and replaced by the real `/api/admin/status` session check.
