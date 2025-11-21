/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export',
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
