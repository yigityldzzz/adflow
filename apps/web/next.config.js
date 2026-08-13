/** @type {import('next').NextConfig} */
const nextConfig = {
  // The app doesn't use next/image anywhere, but Next.js still exposes the
  // /_next/image optimization endpoint (which uses the bundled `sharp`
  // package) by default. `sharp`'s bundled libvips currently has open
  // high-severity CVEs that are only fully resolved by a Next.js major
  // version bump (deferred as a separate migration). Disabling image
  // optimization removes that attack surface entirely in the meantime,
  // with zero functional impact since it isn't used.
  images: { unoptimized: true },
};

module.exports = nextConfig;
