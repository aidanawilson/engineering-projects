# Apogee Lab Projects — Frontend V1

Frontend V1 for:

`projects.apogeelab.org`

This is the approved frontend structure that the backend will now be built around.

The site is intentionally framework-free and can be hosted directly through GitHub + Cloudflare Pages.

---

## Repository structure

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

The individual project HTML files are temporary static implementations used by Frontend V1. Once project data is loaded dynamically from D1, a reusable project-page template can replace the hard-coded project pages.

---

# Frontend structure

## Projects homepage

The homepage is tile-first.

```text
[ Apogee Lab / Projects header ]

Projects                         short explanation

[           featured project tile            ]

[ second project ]        [ third project ]

[ additional projects continue below ]
```

Key behavior:

- no large hero section
- project tiles are the primary focus immediately after page load
- all project tiles use the same vertical height
- the featured project is emphasized by width and placement rather than extra height
- card backgrounds remain blurred enough for readable overlay text
- project cards show:
  - project number
  - project status
  - title
  - homepage description
  - selected tags
- the main-site link in the header is underlined

---

## Individual project page

Each project page is structured as:

```text
Header

Project hero
├── large visual / image
└── project summary
    ├── title
    ├── tags
    ├── About description
    ├── status
    └── metadata

Development Log
├── ★ Latest Version
│   ├── title
│   ├── full update text
│   └── image carousel
│
└── Previous Updates
    ├── compact update
    ├── compact update
    └── ...

Gallery
└── all project images
```

The newest update is visually emphasized and may show its attached image carousel.

Older updates remain compact so the development history stays readable as projects grow.

---

# Project-page scroll cue

Project pages include a fixed Development Log cue near the bottom of the visitor's viewport.

Behavior:

```text
page loads
    ↓
cue remains visible

visitor scrolls a little
    ↓
cue remains visible

visitor clicks the cue
    ↓
page scrolls to Development Log
    ↓
cue remains visible

visitor reaches about 50% through Updates
    ↓
cue fades away
```

The threshold uses the center of the visitor's viewport relative to the midpoint of the Updates section so the behavior remains consistent across phones, laptops, split-screen windows, and larger displays.

---

# Planned backend architecture

Frontend V1 will connect to a new, independent Projects backend.

```text
projects.apogeelab.org
        │
        ├── Cloudflare Pages
        │     frontend
        │
        ├── Projects Worker
        │     API + admin authentication
        │
        ├── Projects D1 database
        │     projects + updates + image metadata
        │
        └── R2 bucket
              project image files
```

The Projects backend is separate from Replay Trader.

The Projects Worker can use the same **password value** as Replay Trader by creating its own `ADMIN_PASSWORD` Cloudflare secret with the same value.

The Projects site itself remains completely public.

Only editing actions require administrator authentication.

---

# Inline admin mode

Admin is integrated into the public site rather than hosted as a separate admin website.

The footer contains:

```text
Admin
```

Clicking Admin opens a login modal on the current page.

After successful authentication, the same website enters admin mode and exposes controls such as:

```text
Projects homepage
-----------------
[ + Add New Project ]


Project page
------------
[ Edit Project ]   [ + New Update ]

Latest update
[ Edit ] [ Delete ]

Gallery
[ + Upload Images ]
```

The browser may display the controls, but authorization is always decided by the Worker.

Every create, edit, delete, or upload request must independently verify the admin session.

---

# Planned authentication

The Projects Worker will use a separate signed admin session.

Planned endpoints:

```text
GET  /api/admin/status
POST /api/admin/login
POST /api/admin/logout
```

Planned session cookie:

```text
HttpOnly
Secure
SameSite=Lax
approximately 12-hour lifetime
```

`ADMIN_PASSWORD` is stored only as a private Cloudflare Worker secret.

The frontend must never contain:

- the admin password
- password hashes
- session-signing secrets

---

# One shared Projects database

All engineering projects live in one D1 database.

A new project does **not** receive its own database or tables.

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

Updates and images reference the project through `project_id`.

---

# Planned D1 schema

## projects

```text
id
slug
name
home_description
about_description
status
start_date
fallback_image_key
sort_order
created_at
updated_at
```

## project_updates

```text
id
project_id
title
version_label
body
created_at
updated_at
```

## project_images

```text
id
project_id
update_id
r2_key
caption
sort_order
created_at
```

Exact schema details can be adjusted during backend implementation, but this relationship should remain:

```text
project
   ├── many updates
   └── many images

update
   └── many images
```

---

# Editable project information

Admin mode must allow an existing project to be edited in place.

Minimum editable fields:

```text
Project title
Homepage / tile description
Full About description
Project status
Tags / disciplines
Sort order
Fallback / hero image
Slug, with safeguards
```

Editing a typo or changing project information updates the same existing D1 project row.

It must not create a replacement project, because the existing:

```text
project_id
updates
images
gallery
URL relationship
```

must remain intact.

---

# Project status

Initial status options:

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

The status is stored as project data and controls the status badge shown on the homepage and project page.

---

# Add New Project

Authenticated admin mode will provide:

```text
+ Add New Project
```

Initial creation fields:

```text
Project title
Project status
Homepage description
Full About description
Tags / disciplines
```

Additional fields may include:

```text
slug
start date
sort order
fallback image
```

Creating a new project inserts a row into the shared `projects` table.

No code change or GitHub deployment should be required to add a project once the backend is complete.

---

# Dynamic homepage tile image

The project tile image will update automatically from development-log content.

Required rule:

```text
newest project update
        ↓
photos attached to update
        ↓
first photo by image sort order
        ↓
project homepage tile background
```

Example:

```text
V2.5 update

1. running-engine.jpg
2. nozzle-test.jpg
3. assembly.jpg
```

The project's homepage tile automatically uses:

```text
running-engine.jpg
```

When a newer update is published with images, its first image automatically becomes the new tile background.

Fallback hierarchy:

```text
1. first image from newest update
2. project fallback / hero image
3. default project visual
```

Image ordering must therefore be preserved in D1.

---

# Development-log image behavior

When images are attached to the newest update:

1. files are uploaded to R2
2. D1 records the image metadata and order
3. images appear in the newest update carousel
4. images also appear in the full project gallery

When that update is no longer the newest:

- the old update becomes compact
- its carousel is not shown in the main log
- the images remain in the Gallery

---

# R2 storage

Actual image files should live in an R2 bucket, not in D1.

Possible bucket:

```text
apogee-project-images
```

Conceptual object layout:

```text
turbojet/
    compressor-cad.webp
    diffuser-v2.webp
    test-run.jpg

lightsaber/
    electronics.webp
    hilt-cad.webp

rocket/
    test-stand.webp
```

D1 stores image metadata and the corresponding R2 object key.

---

# Planned API

## Public reads

```text
GET /api/projects
GET /api/projects/:slug
GET /api/projects/:slug/updates
GET /api/projects/:slug/images
```

## Admin-only project writes

```text
POST   /api/projects
PUT    /api/projects/:id
DELETE /api/projects/:id
```

## Admin-only update writes

```text
POST   /api/projects/:id/updates
PUT    /api/updates/:id
DELETE /api/updates/:id
```

## Admin-only image writes

```text
POST   /api/projects/:id/images
DELETE /api/images/:id
```

All write endpoints must validate the administrator session on the Worker.

---

# Backend implementation order

Recommended next steps:

```text
1. Create Projects Worker
2. Create Projects D1 database
3. Create R2 image bucket
4. Add ADMIN_PASSWORD Worker secret
5. Implement admin session endpoints
6. Create D1 tables
7. Implement public project read API
8. Convert frontend project data from static HTML to API data
9. Connect inline Edit Project / Add Project controls
10. Implement project updates
11. Implement image uploads and gallery
12. Remove hard-coded individual project HTML files
```

Frontend V1 is the visual and interaction baseline for that implementation.
