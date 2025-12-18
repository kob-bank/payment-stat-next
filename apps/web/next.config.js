/** @type {import('next').NextConfig} */
const nextConfig = {
    output: "standalone",
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
