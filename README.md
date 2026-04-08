# near-field-demo

A two-chapter interactive educational demo explaining the core physics of near-field infrared imaging and NIR spectroscopy for medical diagnostics.

**Chapter 1 — Breaking the Diffraction Limit**  
Drag the tip-radius slider to see how spatial resolution is set by tip geometry, not wavelength. Watch gold nanorods snap into clarity as the tip enters the near-field regime (< 100 nm), then merge into an unresolvable blob in the far-field.

**Chapter 2 — Reading the Tissue Window**  
Drag the wavelength cursor across the absorption spectrum. Adjust oxygenation to see how HbO₂ and Hb are spectroscopically distinguishable in the NIR optical window, and how penetration depth into tissue varies with wavelength and blood oxygenation state.

## Features

- Gaussian convolution simulation of tip-limited resolution
- Live Hb / HbO₂ absorption curves with interpolated weighted sum
- Tissue cross-section with depth-dependent light penetration
- Draggable wavelength cursor with live tooltip
- Six expandable physics explainers (modal pop-ups)
- "Real Output" decoder panel with procedurally generated false-colour s-SNOM image
- Fully static — no build step, no server, no external API calls
- Responsive down to 360 px; DPR-aware canvas rendering

## Embed

```html
<iframe
  src="https://DuncanPoisson.github.io/near-field-demo/"
  width="900"
  height="700"
  frameborder="0"
  allowfullscreen
  loading="lazy">
</iframe>
```

## Local preview

Open `index.html` directly in any modern browser. No build step required.
