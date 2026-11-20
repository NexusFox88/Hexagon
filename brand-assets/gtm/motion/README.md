# Fleet formation motion

The H is one unit at rest and a fleet in motion. Fifteen original H units separate into an ordered formation and return to a single identity. This is abstract brand animation, not a count of supported providers or a progress indicator.

- `formation-{dark,light}.mp4`: 1280 x 720, four seconds, 24 fps, silent. Suitable as a bumper or chapter transition. MP4 cannot respond to reduced-motion preferences; use a poster instead for that audience.
- `formation-{dark,light}.svg`: vector CSS motion, four-second loop, stops at a single H under `prefers-reduced-motion: reduce`. Do not assume every image host permits SVG animation.
- `formation-{dark,light}-poster.png`: static formation keyframe.

Regenerate from the repository root after installing the GTM dependencies:

```sh
python3 brand-assets/gtm/tooling/motion.py
node brand-assets/gtm/tooling/render-motion.mjs
ffmpeg -y -framerate 12 -i .local/gtm-motion/dark/%04d.png -vf format=yuv420p -r 24 -c:v libx264 -crf 18 -movflags +faststart brand-assets/gtm/motion/formation-dark.mp4
ffmpeg -y -framerate 12 -i .local/gtm-motion/light/%04d.png -vf format=yuv420p -r 24 -c:v libx264 -crf 18 -movflags +faststart brand-assets/gtm/motion/formation-light.mp4
```

Frames are generated at 12 unique poses per second and encoded at 24 fps. Use the same Python environment installed for the static builder. Private intermediate frames stay in `.local/gtm-motion`.

## Website-derived ASCII flyby

`flyby-dark` and `flyby-light` reuse the original website ASCII execution-unit algorithm and Bayer-dither atmosphere. Each is available as a four-second 1280 x 720 MP4, an animated SVG and a static poster. The SVG disables motion when reduced motion is requested. MP4 is 24 fps encoded from 12 unique poses per second; it does not represent product execution. Use the static poster for reduced-motion contexts. See `../WEBSITE-REUSE.md`.
