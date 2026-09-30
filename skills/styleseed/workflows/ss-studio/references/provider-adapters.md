# Media and recording provider adapters

Select an adapter by capability. Tool names can change; the run contract must remain stable.

## Raster generation

Use for photography, illustration, texture, scene material, or image compositing. Do not render
final interface typography or accessible controls into the bitmap.

Required evidence:

- complete prompt and all reference-image roles;
- provider/model identifier and generation date;
- input and output paths copied into the run;
- review status and usage-rights note;
- a code-native fallback when the asset is nonessential.

## Video generation

Use for ambient footage, product-world imagery, texture motion, or an explicitly narrative asset.
Do not substitute a generated clip for a real clickable UI state transition.

Required evidence:

- prompt, input still/video, duration, aspect ratio, and intended consuming shot;
- provider/model identifier;
- output copied into the run and labeled `generated-media`;
- temporal review for warping, unreadable text, accidental UI, and loop seams.

## Prototype recording

Record the real app or browser prototype at its locked viewport. Capture each signature scene from
a stable start state and include interruption/back behavior. Store the raw recording before any
showcase edit.

Required evidence:

- route/build identifier and viewport;
- interaction script and input method;
- raw recording path;
- extracted start/mid/end frames;
- reduced-motion capture when the scene materially changes.

## Reel composition

Compose only after the prototype passes. The shot manifest remains authoritative. A reel can mix
prototype recordings and generated media, but every shot must retain its `sourceType`. Do not apply
editing that makes the product appear to support an interaction it does not support.
