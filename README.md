# popupable

A lightweight, zero-dependency lightbox library using modern JavaScript and CSS.
Just add `data-popupable` to any image!

[![npm version](https://badge.fury.io/js/popupable.svg)](https://www.npmjs.com/package/popupable)
[![jsDelivr](https://data.jsdelivr.com/v1/package/npm/popupable/badge)](https://www.jsdelivr.com/package/npm/popupable)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[**Live Demo**](https://popupable.ewanhowell.com/)

## Features

* No dependencies
* Animates open from the element's original position
* Multiple built-in animation styles, with support for custom ones
* Works with mouse, touch, and keyboard
* Gallery groups with swipe, scroll, keyboard, and button navigation
* Supports both images and videos
* Thumbnail strip and image counter
* Pinch-to-zoom on touch, with optional click/tap-to-zoom support
* Checkerboard background for transparent images
* Attribute inheritance - set options on a parent to apply to all children
* Customizable via CSS variables
* Works in Vue, React, Svelte, and more

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
| `data-popupable-anim="name"` | Sets the open/close animation style. |
| `data-popupable-group="name"` | Groups images into a navigable gallery. Can be placed on a container element to group all `data-popupable` children. |
| `data-popupable-counter` | Shows a "1 / N" counter when in a group. |
| `data-popupable-thumbnails` | Shows a thumbnail strip when in a group. |
| `data-popupable-thumb="url"` | Image to use for this element in the thumbnail strip. Falls back to `data-popupable-src` and then `src`. Useful for serving a small thumbnail image instead of letting the strip render the full popup source, which keeps the strip lightweight even with many large images. |
| `data-popupable-order="..."` | Controls the order of UI elements. |
| `data-popupable-type="image\|video"` | Forces popupable to treat the source as an image or video regardless of its tag name or file extension. |
| `data-popupable-poster="url"` | Poster image to show before a video has loaded. Also used as the placeholder for video thumbnails. |
| `data-popupable-attr="..."` | Comma-separated list of properties to set on the `<video>` element. See [Videos](#videos). |

### Inheritance

All `data-popupable-*` attributes except `data-popupable` itself are **inherited**. If an attribute isn't on the element, popupable walks up the DOM tree to find it on a parent. This lets you set options once on a container instead of repeating them on every child.

Set an attribute to `"false"` to explicitly unset an inherited value:

```html
<div data-popupable-anim="pop" data-popupable-counter data-popupable-thumbnails>
  <img src="photo1.jpg" data-popupable>
  <img src="photo2.jpg" data-popupable data-popupable-counter="false">
</div>
```

## Advanced Usage

### Non-image elements

Any element can be made popupable. Use `src` or `data-popupable-src` to specify the image to display:

```html
<div src="photo.jpg" style="background-image: url(photo.jpg)" data-popupable></div>
<div style="background-image: url(photo.jpg)" data-popupable data-popupable-src="photo.jpg"></div>
```

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

### Videos

popupable supports videos in the same gallery flow as images. A source is treated as a video if any of these are true:

* The element is a `<video>` tag.
* The URL ends in one of: `.mp4`, `.m4v`, `.webm`, `.ogv`, `.mov`, `.3gp`, `.m3u8`, `.flv`.
* `data-popupable-type="video"` is set on the element (or inherited from a parent).

Use `data-popupable-type` explicitly when the tag/extension doesn't match what you actually want — for example, when the URL doesn't reveal the underlying format (a proxied URL, a query-string-only URL), or when you want to force a `<video>` element or a `.mp4`-extensioned URL to be rendered as an image:

```html
<!-- Force video on a URL that doesn't end with a video extension -->
<div data-popupable data-popupable-type="video" src="/video/clip"></div>

<!-- Force image on a URL or tag that would otherwise be detected as video -->
<div data-popupable data-popupable-type="image" src="/render/clip.mp4"></div>
```

#### Poster images

Add `data-popupable-poster` to provide a still image to show before the video has loaded:

```html
<video src="clip.mp4" poster="clip.jpg" data-popupable></video>
<div data-popupable data-popupable-type="video" src="/video/clip" data-popupable-poster="/preview/clip.jpg"></div>
```

If the source is a `<video>` element, its `poster` attribute is also used automatically.

> **Recommended for large galleries.** When a video has a poster, popupable uses an `<img>` for its thumbnail strip entry instead of a `<video>`. Posters load much faster than a video's metadata range request, especially across many thumbnails at once, so the strip fills in quickly even with hundreds of items.

#### Passing attributes to the `<video>` element

Use `data-popupable-attr` to set properties on the underlying `<video>` element. The value is a comma-separated list of `name` or `name=value` pairs. Values are parsed as `true`/`false`, numbers, or strings.

Names are JavaScript property names (e.g. `playbackRate`, `playsInline`, `disablePictureInPicture`). They are matched case-insensitively, so both the camelCase property style and the lowercase HTML-attribute style (`playsinline`, `disablepictureinpicture`) are supported.

```html
<!-- Hide the controls bar -->
<div data-popupable data-popupable-type="video" data-popupable-attr="controls=false" src="/video/clip"></div>

<!-- Autoplay muted, looping, at 1.5x speed -->
<div data-popupable data-popupable-type="video" data-popupable-attr="muted,loop,autoplay,playbackRate=1.5" src="/video/clip"></div>
```

`data-popupable-attr` is inherited, so you can set defaults on a group container.

Notes on `controls`:

* By default, videos get `controls=true` when opened.
* If `controls` is mentioned in `data-popupable-attr` (e.g. `controls`, `controls=true`, `controls=false`), that explicit value is respected.
* `data-popupable-zoomable` always forces `controls=false`, regardless of `data-popupable-attr`, because zoomable mode uses click and scroll for zoom/pan.

Videos are always rendered with `playsInline`.

### Zoom

All images support pinch-to-zoom. Add `data-popupable-zoomable` to also enable tap/click-to-zoom and scroll wheel zoom:

```html
<img src="map.jpg" data-popupable data-popupable-zoomable>
```

When zoomed in, pan by dragging and zoom in/out with the scroll wheel. Click the image or background, or pinch back to scale 1, to unzoom. A close button also appears in the corner when `data-popupable-zoomable` is set.

### Groups / Galleries

Group multiple images together with `data-popupable-group`. Users can navigate with arrow buttons, swipe gestures, scroll wheel, or keyboard shortcuts.

Place `data-popupable-group` directly on elements or on a container to group all `data-popupable` children:

```html
<!-- On each element -->
<img src="photo1.jpg" data-popupable data-popupable-group="holiday">
<img src="photo2.jpg" data-popupable data-popupable-group="holiday">
<img src="photo3.jpg" data-popupable data-popupable-group="holiday">

<!-- Or on a container (inherited) -->
<div data-popupable-group="holiday">
  <img src="photo1.jpg" data-popupable>
  <img src="photo2.jpg" data-popupable>
  <img src="photo3.jpg" data-popupable>
</div>
```

### Counter and thumbnails

Add `data-popupable-counter` and/or `data-popupable-thumbnails` to show those UI elements in a gallery. These inherit, so placing them on the group container applies them to all members:

```html
<div data-popupable-group="holiday" data-popupable-counter data-popupable-thumbnails>
  <img src="photo1.jpg" data-popupable>
  <img src="photo2.jpg" data-popupable>
  <img src="photo3.jpg" data-popupable>
</div>
```

### Custom UI order

Control the order of UI elements around the image with `data-popupable-order`. The `image` token marks where the image sits; everything before it goes in the header, everything after goes in the footer.

```html
<!-- Counter above image, thumbnails and content below -->
<img data-popupable data-popupable-order="counter,image,thumbnails,content">
```

Default order: `counter,image,content,thumbnails`

### Keyboard navigation

| Keys | Action |
|---|---|
| `→` `↓` `Page Down` `D` `S` | Next image |
| `←` `↑` `Page Up` `A` `W` | Previous image |
| `Home` | First image |
| `End` | Last image |
| `1`–`9` | Jump to image by number |

### Large galleries

popupable is designed to handle galleries with many items. Only the slides near the active one are kept loaded; the rest are unloaded automatically and shown as a blurred-gradient placeholder until you scroll back to them. Prefetching adjusts as you drag, so slides you scroll onto are loaded by the time they reach view.

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

### Animation styles

Use `data-popupable-anim` to choose an open/close animation style. The default is `expand`.

| Value | Description |
|---|---|
| `expand` | Expands from the image's original position (default) |
| `pop` | Scales up from a slightly smaller version at the final position |
| `line` | Expands vertically from a thin horizontal line at the center, like a CRT TV powering on |
| `float` | Fades in while rising upward into position |

```html
<img src="photo.jpg" data-popupable data-popupable-anim="line">
```

The popup container receives a `popupable-anim-{name}` class (e.g. `popupable-anim-float`), which can be used to apply custom CSS for that animation style.

#### Custom animation styles

Register your own animation style by adding an object to `window.popupableAnimTypes`. The object must have a `position` method that receives the original element and the final expanded rect, and returns the starting rect for the open animation (which is also the ending rect for close). Additional static flags control the animation behaviour.

| Property | Type | Description |
|---|---|---|
| `position(el, rect)` | function | Returns `{ top, left, width, height }` for the start of the open animation |
| `styles` | boolean | Copies border, outline, and box-shadow from the element to the popup clone, then transitions them out |
| `fade` | boolean | Fades opacity in/out alongside the geometry |
| `crossfade` | boolean | Crossfades between the thumbnail and alternate source image as it opens |
| `hideSource` | boolean | Hides the original element while the popup is open |

```js
window.popupableAnimTypes.myAnim = {
  fade: true,
  position(original, rect) {
    return {
      top: rect.top + rect.height / 2,
      left: rect.left,
      width: rect.width,
      height: 0
    }
  }
}
```

### Shadow DOM

popupable works inside open shadow roots out of the box. Clicks, attribute inheritance, and gallery grouping all cross shadow boundaries. Place `data-popupable-*` attributes on any ancestor and they will inherit into images inside shadow DOM.

The one thing that can't be auto-injected is the hover cursor, because document-level CSS doesn't reach into shadow roots. Add this one-liner to any shadow root that hosts popupable elements:

```css
[data-popupable], [data-popupable] * { cursor: pointer }
```

Closed shadow roots (`mode: "closed"`) are not supported from the outside. To use popupable inside a closed shadow root, load it from within that root yourself so it has direct access to the contents.

## Customization

Popups can be styled using CSS variables:

```css
:root {
  /* Overlay */
  --popupable-background: #000B;        /* Backdrop color */
  --popupable-blur: 6px;                /* Backdrop blur amount */

  /* UI elements (header, footer, buttons) */
  --popupable-ui-background: #0008;     /* Header/footer/button background */
  --popupable-text-color: #fff;         /* Text and icon color */

  /* Spacing */
  --popupable-screen-padding: 40px;     /* Minimum gap between image and viewport edge */

  /* Animation */
  --popupable-open-duration: .25s;      /* Open/close transition duration */
  --popupable-open-easing: ease;        /* Open/close transition easing */
  --popupable-switch-duration: .25s;    /* Gallery navigation transition duration */
  --popupable-switch-easing: ease;      /* Gallery navigation transition easing */
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

MIT © [Ewan Howell](https://ewanhowell.com/)