# Collectible artwork

Artwork is cosmetic. Its manifest is separate from the economy, save state and appraisals. The app ships ten approved cars; the other fifty pieces work with local category fallbacks until their images are published. The same shared `Artwork` component can support another catalogue later; property and business-stage manifests are not registered here.

## Rendering

`src/content/collectible-artwork.json` maps existing piece IDs to three square WebP variants, ordered 256, 512 and 1024 pixels. Each entry records its public immutable UploadThing URL, dimensions and byte count. The schema rejects unknown piece IDs, incorrect dimensions, non-public UploadThing URLs and files above 100,000 bytes. Missing entries are intentional.

Auction lots show full artwork; owned pieces keep compact 72-point thumbnails for scanning a large collection. Both use `CollectibleArtwork`, backed by the shared `Artwork` component. Expo Image picks the source for the container size and screen density, keeps the whole composition visible, and caches loaded images in memory and on disk. A category fallback reserves the same square while loading or after failure. Changing the source resets loading/error state, preventing a previously displayed piece from leaking into the new one. Artwork is decorative for screen readers; the adjacent row provides the piece name, category, rarity and value.

The game never waits for artwork, and there is no bulk download at launch. Previously viewed images may work offline from cache; eviction is controlled by the platform, so the local fallback is always available. Artwork that has never been downloaded cannot appear on a first offline launch.

This adds the native `expo-image` module: make a new development/Release build before running it. Expo Go is not supported. SDK reference: <https://docs.expo.dev/versions/v58.0.0/sdk/image/>.

## Add or replace a piece

1. Generate a square master of at least 1024 × 1024 pixels. Use the approved dark studio catalogue style, a complete subject with safe margins, fictional designs, and no branding or text. Keep the master and exact prompt in the asset archive. Review it at full size and thumbnail size before publishing.
2. Supply the project's complete V7 token as `UPLOADTHING_TOKEN` in the publishing shell or secret manager. Never put it in the app, manifest, source code or a committed environment file. The installed `uploadthing` SDK and `sharp` are development tools only.
3. From the repository root run:

   ```sh
   bun run artwork:publish corner_cafe_sketch /path/to/approved-master.png
   ```

   The command validates the piece ID and existing manifest first, creates sRGB WebP variants in `.scratch/artwork/<piece-id>/` at quality 82, checks the byte budget, uploads all three as public files, and downloads them again to compare their bytes. Only after verification does it atomically replace that piece's entry in the local manifest. If uploading or verification fails, the existing manifest remains intact. Successfully uploaded files can remain orphaned after a failure; inspect the project dashboard before retrying. The command never deletes old assets, including images referenced by older app builds.
4. Review the manifest diff and all three local images. Run `bun run format` and `bun run check`, then open a PR. A publish command modifies the manifest; it does not publish a new app build.

Keep each URL immutable. Replacements get new upload keys. Because the manifest is bundled and OTA updates are disabled, adding or replacing artwork requires an app release. UploadThing credentials and publishing dependencies are never needed on a player's device.

