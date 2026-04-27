# Volume

`Vivancodes` is a static website for a collection of intentionally inconvenient volume sliders.

The site is intended to be served at `https://vivancodes.com/`.

This fork also includes a tiny local bridge so the slider pages can control the real system volume on macOS and Windows.

## Download

Go to the latest GitHub release and download the file for your computer:

- **Mac with Apple Silicon**: `Weird-Volume-Sliders-Mac-arm64.dmg`
- **Mac with Intel chip**: `Weird-Volume-Sliders-Mac-x64.dmg`
- **Windows**: `Weird-Volume-Sliders-Windows-Setup.exe`

### Mac first launch

1. Open the `.dmg`.
2. Drag **Weird Volume Sliders** into **Applications**.
3. Open **Weird Volume Sliders** from Applications.

The app is not Apple-notarized yet, so macOS may block it the first time. If that happens, right-click **Weird Volume Sliders**, choose **Open**, then choose **Open** again. After that, launching it is just opening the app normally.

### Windows first launch

1. Open `Weird-Volume-Sliders-Windows-Setup.exe`.
2. Follow the installer.
3. Open **Weird Volume Sliders** from the Start menu or desktop shortcut.

Windows SmartScreen may warn because the app is unsigned. Choose **More info** and **Run anyway** if you trust this download. After installing, launching it is just opening the app normally.

The app opens the sliders in its own window and changes the real system volume on that computer.

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

GitHub Actions builds release downloads automatically when a tag starting with `v` is pushed, for example `v1.1.0`.

To build locally after installing dependencies:

```sh
npm run dist:mac
npm run dist:windows
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
