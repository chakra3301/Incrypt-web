import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack(config, { isServer }) {
    // allow Web Worker bundling
    config.output.globalObject = "self";
    
    // Handle WASM files
    config.module.rules.push({
      test: /\.wasm$/,
      type: "asset/resource",
    });
    
    // Add asyncWebAssembly experiment
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };
    
    // Handle Node.js modules in the browser
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    
    return config;
  },
};

export default nextConfig;