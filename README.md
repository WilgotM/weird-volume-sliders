# Volume

`Vivancodes` is a static website for a collection of intentionally inconvenient volume sliders.

The site is intended to be served at `https://vivancodes.com/`.

This fork also includes a tiny local bridge so the slider pages can control the real system volume on macOS and Windows.

## Download

Go to the latest GitHub release and download the file for your computer:

- **Mac with Apple Silicon**: `weird-volume-sliders-macos-arm64.zip`
- **Mac with Intel chip**: `weird-volume-sliders-macos-intel.zip`
- **Windows**: `weird-volume-sliders-windows-x64.zip`

Unzip the file and run the starter inside it:

- **Mac**: double-click `run-mac.command`
- **Windows**: double-click `run-windows.bat`

It starts a local server and prints a link:

```text
http://127.0.0.1:3777
```

Open that link in your browser and pick any slider. The sliders will change the real system volume on that computer.

On macOS, the app is unsigned, so you may need to right-click it and choose **Open** the first time. On Windows, SmartScreen may warn because the app is unsigned; choose **More info** and **Run anyway** if you trust this download.

## Run locally with real system volume

```sh
npm start
```

Then open `http://127.0.0.1:3777` and pick any slider.

The local server serves the static files and exposes `POST /api/volume`. That endpoint only accepts a number from `0` to `100` and applies it with the operating system's volume API.

On macOS it uses `osascript`:

```applescript
set volume output volume <number>
```

On Windows it uses PowerShell to call the Windows Core Audio API.

## Build downloads

GitHub Actions builds release zips automatically when a tag starting with `v` is pushed, for example `v1.0.0`.

To build locally after installing dependencies:

```sh
npm run build:downloads
```

## What it includes

- A homepage for the collection
- A dedicated page for each slider project
- Plain HTML, CSS, and JavaScript for the site
- A local Node.js macOS and Windows volume bridge
- SEO basics for the homepage and every project page

## How the collection works

Each project is its own standalone static page under `sliders/<slug>/index.html`. The homepage and `/sliders/` page link directly to those folders, which keeps the public URLs clean.

## Adding a new slider

1. Create a new folder at `sliders/<slug>/`.
2. Add `index.html` inside that folder using an existing slider page as the template.
3. Link `../../assets/site.css` and `../../assets/vivancodes_logo.png`.
4. Keep the mechanic self-contained with plain HTML, CSS, and JavaScript.
5. Add the new project to:
   - `index.html`
   - `sliders/index.html`
   - `sitemap.xml`
   - Homepage JS

## GIF previews

Homepage and `/sliders/` cards also show a looping GIF preview from `assets/gifs/<slug>.gif`.

- GIF previews are used on the homepage and the `/sliders/` page.
- If a matching GIF is missing, the card stays in its current text-only layout.

## Original frontend-only status

The original public site is frontend-only. The local bridge in this fork is only for controlling your own computer's volume while running from that machine.
