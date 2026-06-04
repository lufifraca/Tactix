# Tactix — Brand Assets

The **Steel Star** mark + **Tactix** wordmark, in the brushed navy→silver finish.

## What's inside

```
tactix-brand/
├─ svg/
│  ├─ tactix-mark.svg            ← primary app icon (tile + gradient star + aperture)
│  ├─ tactix-mark-flat.svg       ← star only, gradient, transparent (drop anywhere)
│  ├─ tactix-mark-mono.svg       ← one-color star (uses currentColor / set fill)
│  ├─ tactix-wordmark.svg        ← "Tactix" logotype  (see font note below)
│  └─ tactix-lockup.svg          ← mark + wordmark, horizontal
├─ icons/
│  ├─ tactix-icon-1024 / 512 / 256 / 192 / 128 .png
│  └─ apple-touch-icon-180.png
├─ favicon/
│  ├─ favicon.svg                ← scalable favicon (aperture removed for clarity)
│  ├─ favicon-64 / 48 / 32 / 16 .png
│  └─ favicon.ico                ← multi-res (16/32/48) for legacy
├─ mark/
│  ├─ tactix-mark-flat-1024.png       ← gradient star, transparent
│  ├─ tactix-mark-mono-light-1024.png ← silver star (for dark backgrounds)
│  └─ tactix-mark-mono-dark-1024.png  ← navy star (for light backgrounds)
└─ spec/
   └─ tactix-spec.png            ← clear-space, min-size, color & one-color reference
```

## Colors

| Role        | Hex       |
|-------------|-----------|
| Navy        | `#1A2E4D` |
| Steel       | `#3A567C` |
| Mid         | `#7991B5` |
| Silver-blue | `#9BAFCE` |
| Light       | `#C9D6EA` |
| Accent      | `#A6BAD8` |
| Tile (dark) | `#161A24` → `#0B0D13` |

The mark gradient runs **top-left → bottom-right** (navy in the corners, a soft silver
band through the middle). The reticle ring is `#B8C8E2`.

## Usage notes

- **Clear space:** keep padding of at least ¼ of the icon width on all sides.
- **Minimum size:** the center aperture (reticle ring) is dropped below ~48 px for clarity —
  that's why the favicon PNGs and `favicon.svg` use the ring-free version.
- **Backgrounds:** use the silver mono on dark UI, the navy mono on light, and the full
  tile icon for app/launcher contexts.

### Favicon / web setup

```html
<link rel="icon" href="/favicon/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon/favicon-32.png" sizes="32x32">
<link rel="icon" href="/favicon/favicon-16.png" sizes="16x16">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon-180.png">
```

## ⚠ Wordmark font note (please read)

The **mark is fully vector and font-independent** — it will render identically everywhere.

The **wordmark/lockup SVGs** are set in **Chakra Petch 700**, pulled from Google Fonts via
an `@import` inside the file. That means:

- They render correctly **in a browser** (the font loads automatically).
- In design tools (Figma/Illustrator) you'll need Chakra Petch installed, **or** the text
  converted to outlines.

For a bulletproof, dependency-free wordmark, the text should be **converted to vector
outlines**. I couldn't do that here because the Chakra Petch font file wasn't available in
this environment. If you drop the `ChakraPetch-Bold.ttf` in (free on Google Fonts), I can
outline it instantly — or you can do it in Figma: select the text → right-click → *Outline
stroke / Flatten*.

## Regenerating

`build_brand.py` produces every raster + SVG; `build_spec.py` builds the spec sheet.
Both are pure Python (Pillow + NumPy) so the gradients are pixel-identical to the design.
