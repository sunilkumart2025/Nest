# TODO for Disabling Next.js Dev Tools "N" Button

- [ ] Update next.config.ts by adding the experimental: { developmentIndicators: { buildActivity: false } } setting to the NextConfig object, without modifying existing typescript, eslint, or images configurations.
- [ ] Restart the development server (stop current npx next dev processes and run npx next dev --turbopack -p 9002 again) to apply the config changes.
- [ ] Verify in the browser at http://localhost:9002 that the "N" Dev Tools button no longer appears at the bottom-left of the screen.
