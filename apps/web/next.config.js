/** @type {import('next').NextConfig} */
const nextConfig = {
    // output: 'export', // Disabled to allow Middleware for Authentication
    images: {
        unoptimized: true,
    },
    // Disable server-side features
    typescript: {
        ignoreBuildErrors: true,
    },
    transpilePackages: ["@repo/ui"],
};

export default nextConfig;
