export function ageOn(dob: Date, now = new Date()) {
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  if (
    now.getUTCMonth() < dob.getUTCMonth() ||
    (now.getUTCMonth() === dob.getUTCMonth() &&
      now.getUTCDate() < dob.getUTCDate())
  )
    age--;
  return age;
}
export function feeFor(
  amount: number,
  basisPoints = 500,
) {
  if (
    !Number.isSafeInteger(amount) ||
    amount < 0 ||
    !Number.isInteger(basisPoints) ||
    basisPoints < 0 ||
    basisPoints > 10000
  )
    throw new Error("Invalid amount or platform fee");
  return Number((BigInt(amount) * BigInt(basisPoints) + 5000n) / 10000n);
}
export function publicUser(u: any) {
  return {
    id: u.id,
    photo: u.photo,
    cover: u.cover,
    name: u.name,
    username: u.username,
    city: u.city,
    website: /^https?:\/\//.test(u.website || "") ? u.website : "",
    tiktok: /^https:\/\/(?:www\.)?tiktok\.com\/@[a-zA-Z0-9_.]+\/?$/.test(u.tiktok || "") ? u.tiktok : "",
    bio: u.bio,
    interests: u.interests,
    instagram: u.instagramPublic ? u.instagram : "",
    verification: u.verification,
  };
}
