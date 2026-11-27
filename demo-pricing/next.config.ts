import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // /motion-test was the dev slug; /motion is the canonical SEO route.
      { source: "/motion-test", destination: "/motion", permanent: true },
      // The home's footer links /components; the components live at /gallery. Temporary: a browser keeps a
      // permanent redirect, and the home's session may build a page at this address.
      { source: "/components", destination: "/gallery", permanent: false },
    ];
  },
};

export default nextConfig;
