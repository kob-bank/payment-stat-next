/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export',
    images: {
        unoptimized: true,
    },
    // Disable server-side features
    typescript: {
        ignoreBuildErrors: false,
    },
};

export default nextConfig;
