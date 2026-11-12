# Brand assets

## `raacase-mark.svg`

The "R" mark used in the header and footer lockups.

> **This is a placeholder.** It was traced by eye from a raster copy of the
> logo, so the bowl curve and the sheared terminals are approximate. Replace it
> with the real vector.

### Replacing it

Overwrite the file, keeping the same name — no code changes needed.

The replacement must be:

- **transparent background** — no white `<rect>`. The mark is rendered as a CSS
  mask, so an opaque background would mask a filled rectangle instead of the
  letter.
- **a single solid shape** — colour inside the file is ignored.
- **the mark only** — not the stacked lockup. The word "raacase" beside it is
  live HTML text (set in Poppins to match the wordmark), so a mark that already
  includes the wordmark would duplicate it.

### Why a mask and not `<img>`

`.brand-mark` in `App.css` paints `background-color: currentColor` through the
SVG as a mask. The mark therefore inherits its colour from context and is
correct in all three places it appears — dark header, light header, and the
always-dark footer — from one file, with no `filter: invert()` and no second
artwork variant.

Consequence: the file is a silhouette. Any internal detail or second colour in
the source vector will be flattened to one solid shape.
