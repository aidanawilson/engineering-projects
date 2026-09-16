# Apogee Lab Projects — Live Frontend V1

This is the live API-connected frontend for `projects.apogeelab.org`.

## Backend

The frontend expects the API at:

`https://projects-api.apogeelab.org`

It uses the existing Cloudflare Worker, D1 database, and R2 image bucket.

## Files

- `index.html` — dynamic Projects homepage
- `project.html` — reusable dynamic project detail page
- `style.css` — portfolio styling plus live/admin/media UI
- `script.js` — API, auth, CRUD, gallery, YouTube, and admin behavior
- `logo.png`
- `favicon.png`
- `lightsaber.webp` — retained asset from Frontend V1
- `turbojet.html` — legacy redirect to the generic project page
- `lightsaber.html` — legacy redirect
- `rocket.html` — legacy redirect

## Public behavior

### Homepage

`GET /api/projects`

Projects are rendered from D1. The first project by backend sort order is the full-width featured tile. All tile backgrounds remain image-only.

Tile background rule:

1. First image of newest update that contains an image
2. No video is ever used as a homepage tile background
3. If no image exists, a technical fallback graphic is shown

### Project page

Project links use:

`project.html?slug=<project-slug>`

The page resolves the slug from `GET /api/projects`, then loads:

- `GET /api/projects/:id`
- `GET /api/projects/:id/updates`
- `GET /api/projects/:id/media`

Hero media follows backend selection:

1. Newest update containing media
2. Video if that update has a video
3. Otherwise first image
4. Text-only newer updates do not replace hero media

### Development Log

Newest update is displayed in full. Older updates are compact.

Latest-update media order:

1. YouTube video if present
2. Image 1
3. Image 2
4. etc.

The latest update includes a simple media selector when more than one media item exists.

### Gallery

The unified gallery contains both images and YouTube videos. Video and image tiles use the same visual dimensions.

YouTube gallery players use the backend `galleryEmbedUrl` and the frontend uses `IntersectionObserver` plus the YouTube iframe JS command interface to play visible videos and pause off-screen players.

## Admin mode

The footer Admin button uses the real backend authentication endpoints:

- `GET /api/admin/status`
- `POST /api/admin/login`
- `POST /api/admin/logout`

The session remains in the HttpOnly API cookie. No admin password or secret exists in the frontend files.

When authenticated, the public site itself becomes the admin interface.

### Homepage admin

- Add New Project
- Name
- Status
- Homepage description
- About description
- Tags
- Start date
- Sort order
- Optional slug

### Project admin

- Edit Project
- Create Development Log update
- Edit Development Log update
- Delete Development Log update
- Add/remove one YouTube video per update
- Upload images with an update
- Remove individual images
- Upload additional images from Gallery by choosing the update

### Video removal

Editing an update and clearing the YouTube URL sends `youtubeUrl: ""`, which removes the stored video fields.

### Image removal

The frontend calls:

`DELETE /api/images/:imageId`

The backend removes the D1 image record and R2 object.

## Deployment

Replace the files in the Cloudflare Pages/GitHub project used by `projects.apogeelab.org` with the files in this package and deploy normally.

The API Worker CORS configuration currently expects the production frontend origin exactly:

`https://projects.apogeelab.org`

Because of that, API operations are intended to be tested on the deployed production hostname rather than by double-clicking the local HTML files.
