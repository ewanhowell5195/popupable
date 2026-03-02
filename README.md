# popupable

A lightweight, zero-dependency lightbox library using modern JavaScript and CSS.
Just add `data-popupable` to any image!

[![npm version](https://badge.fury.io/js/popupable.svg)](https://www.npmjs.com/package/popupable)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[**Live Demo**](https://popupable.ewanhowell.com/)

## Features

* No dependencies
* Animates open from the element's original position
* Works with mouse, touch, and keyboard
* Gallery groups with swipe, scroll, keyboard, and button navigation
* Thumbnail strip and image counter
* Pinch-to-zoom on touch, with optional click/tap-to-zoom support
* Load a hi-res image on open
* Checkerboard background for transparent images
* Customizable via CSS variables

## Quick Start

### Install via npm
```bash
npm install popupable
```

```js
import "popupable/styles.css"
import "popupable"
```

### Or use via CDN
https://www.jsdelivr.com/package/npm/popupable

### Add popups to your images

```html
<img src="photo.jpg" data-popupable>
<img src="thumbnail.jpg" data-popupable data-popupable-src="full-res.jpg">
<img src="photo.jpg" data-popupable data-popupable-title="Sunset" data-popupable-description="Taken in July 2024">
```

Close by clicking again, or pressing Escape, Backspace, or Delete.

## Settings

| Attribute | Description |
|---|---|
| `data-popupable` | Required. Marks an image as openable. Optionally set a value to give the popup a CSS `id`. |
| `data-popupable-src="url"` | A different image to display when the popup is open, e.g. a higher resolution version. |
| `data-popupable-title="text"` | Title text shown alongside the image. |
| `data-popupable-description="text"` | Description text shown alongside the image. |
| `data-popupable-transparent` | Shows a checkerboard background behind transparent images. |
| `data-popupable-maintain-aspect` | Uses the element's rendered aspect ratio instead of the image's natural dimensions. |
| `data-popupable-no-upscale` | Prevents the popup from scaling the image beyond its native resolution. |
| `data-popupable-zoomable` | Enables click/tap-to-zoom and scroll wheel zoom. |
| `data-popupable-group="name"` | Groups images into a navigable gallery. |
| `data-popupable-counter` | Shows a "1 / N" counter when in a group. Read from the clicked image. |
| `data-popupable-thumbnails` | Shows a thumbnail strip when in a group. Read from the clicked image. |
| `data-popupable-order="..."` | Controls the order of UI elements. See [Custom UI order](#custom-ui-order). |

## Advanced Usage

### Hi-res source

Use `data-popupable-src` to display a different (e.g. higher resolution) image when the popup is open:

```html
<img src="thumbnail.jpg" data-popupable data-popupable-src="full-res.jpg">
```

### Transparent images

Add `data-popupable-transparent` to show a checkerboard background behind transparent images:

```html
<img src="icon.png" data-popupable data-popupable-transparent>
```

### Maintain aspect ratio

By default, the popup size is calculated from the image's natural dimensions. Add `data-popupable-maintain-aspect` to use the element's rendered aspect ratio instead, which is useful when the image is cropped or stretched via CSS:

```html
<img src="photo.jpg" data-popupable data-popupable-maintain-aspect>
```

### Prevent upscaling

Add `data-popupable-no-upscale` to prevent the popup from scaling the image beyond its native resolution:

```html
<img src="pixel-art.png" data-popupable data-popupable-no-upscale>
```

### Zoom

All images support pinch-to-zoom. Add `data-popupable-zoomable` to also enable tap/click-to-zoom and scroll wheel zoom:

```html
<img src="map.jpg" data-popupable data-popupable-zoomable>
```

When zoomed in, pan by dragging and zoom in/out with the scroll wheel. Click the image or background, or pinch back to scale 1, to unzoom.

### Groups / Galleries

Group multiple images together with `data-popupable-group`. Users can navigate with arrow buttons, swipe gestures, scroll wheel, or keyboard shortcuts.

```html
<img src="photo1.jpg" data-popupable data-popupable-group="holiday">
<img src="photo2.jpg" data-popupable data-popupable-group="holiday">
<img src="photo3.jpg" data-popupable data-popupable-group="holiday">
```

###Counter and thumbnails

Add `data-popupable-counter` and/or `data-popupable-thumbnails` to individual group members. The attributes are read from whichever image is clicked to open the gallery, so add them to every image that should show these elements:

```html
<img src="photo1.jpg" data-popupable data-popupable-group="holiday" data-popupable-counter data-popupable-thumbnails>
<img src="photo2.jpg" data-popupable data-popupable-group="holiday" data-popupable-counter data-popupable-thumbnails>
<img src="photo3.jpg" data-popupable data-popupable-group="holiday" data-popupable-counter data-popupable-thumbnails>
```

###Custom UI order

Control the order of UI elements around the image with `data-popupable-order`. The `image` token marks where the image sits; everything before it goes in the header, everything after goes in the footer.

```html
<!-- Counter above image, thumbnails and content below -->
<img data-popupable data-popupable-order="counter,image,thumbnails,content">
```

Default order: `counter,image,content,thumbnails`

###Keyboard navigation

| Keys | Action |
|---|---|
| `→` `↓` `Page Down` `D` `S` | Next image |
| `←` `↑` `Page Up` `A` `W` | Previous image |
| `Home` | First image |
| `End` | Last image |
| `1`–`9` | Jump to image by number |

### Custom IDs

Set the value of `data-popupable` to give the popup a CSS `id`, useful for per-popup styling. In a gallery, the `id` updates as you navigate, so each image can have its own style:

```html
<img src="red.jpg"   data-popupable="theme-red"   data-popupable-group="themed">
<img src="green.jpg" data-popupable="theme-green" data-popupable-group="themed">
<img src="blue.jpg"  data-popupable="theme-blue"  data-popupable-group="themed">
```

```css
#theme-red   { --popupable-background: #3a0000cc; }
#theme-green { --popupable-background: #003a00cc; }
#theme-blue  { --popupable-background: #00003acc; }
```

## Customization

Popups can be styled using CSS variables:

```css
:root {
  /* Overlay */
  --popupable-background: #000B;        /* Backdrop color */
  --popupable-blur: 6px;                /* Backdrop blur amount */

  /* UI elements (header, footer, buttons) */
  --popupable-ui-background: #0008;     /* Header/footer/button background */

  /* Spacing */
  --popupable-screen-padding: 40px;     /* Minimum gap between image and viewport edge */

  /* Animation */
  --popupable-open-duration: .25s;      /* Open/close transition duration */
  --popupable-switch-duration: .25s;    /* Gallery navigation transition duration */
}
```

## How it works

popupable uses a clone-and-expand technique:

1. **Clones the image** at its exact on-screen position and size
2. **Hides the original** and appends the clone as a fixed overlay
3. **Animates the clone** to fill the viewport, respecting aspect ratio and padding
4. **On close**, reverses the animation back to the original position, then removes the overlay

This gives a seamless visual transition with no layout shifts.

## License

MIT © [Ewan Howell](https://github.com/ewanhowell5195)