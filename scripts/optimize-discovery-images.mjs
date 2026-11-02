// Add derived responsive assets; original photographs are preserved.
import sharp from "sharp";
for (const width of [800, 1600])
  await sharp("public/images/hero.jpg")
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(`public/images/hero-${width}.webp`);
// Cards and profile covers now use responsive public derivatives as well.
// Never transform private uploads or replace original artwork.
const { mkdir } = await import('node:fs/promises');
await mkdir('public/images/optimized', { recursive: true });
for (const name of ['neon','live','rooftop','sunset','festival','halloween','social','profile-cover']) {
  for (const width of [480,960,1440]) {
    await sharp(`public/images/${name}.${name === 'profile-cover' ? 'png' : 'jpg'}`)
      .resize({ width, withoutEnlargement: true }).webp({ quality: 82 })
      .toFile(`public/images/optimized/${name}-${width}.webp`);
  }
}
