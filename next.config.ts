import type { NextConfig } from 'next';

const SECURITY_HEADERS: { key: string; value: string }[] = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

/**
 * A production build FAILS without a valid NEXT_PUBLIC_API_BASE_URL (spec
 * §8.3). NEXT_PUBLIC_* is baked in at build time; asima once shipped a green
 * build that silently pointed every visitor's browser at localhost. `next dev`
 * is unaffected.
 */
function assertDeployEnv(): void {
  if (process.env.NODE_ENV !== 'production') return;
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!raw) {
    throw new Error(
      'NEXT_PUBLIC_API_BASE_URL is required for a production build. Set it to the ' +
        'API root including /api/v1, e.g. https://<service>.onrender.com/api/v1.',
    );
  }
  try {
    new URL(raw);
  } catch {
    throw new Error(`NEXT_PUBLIC_API_BASE_URL must be an absolute URL; received "${raw}".`);
  }
}

assertDeployEnv();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // A build into .next under a running `next dev` breaks the dev server;
  // the e2e build writes to its own directory.
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  // /staff has no page of its own. Redirected here, as HTTP, before React
  // renders: a page calling redirect() during a client navigation under the
  // staff layout crashed the App Router ("Rendered more hooks…").
  async redirects() {
    return [{ source: '/staff', destination: '/staff/schedule', permanent: false }];
  },
  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
