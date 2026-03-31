/** @type {import('next').NextConfig} */
const nextConfig = {
    typescript: {
          ignoreBuildErrors: true,
    },
        async redirects() {
                    return [
                        {
                                            source: '/',
                                            destination: '/login',
                                            permanent: false,
                        },
                                ]
        },
}

module.exports = nextConfig
