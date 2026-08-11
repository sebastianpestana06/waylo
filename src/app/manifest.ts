import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Waylo",
    short_name: "Waylo",
    description: "Collaborative holiday trip planner",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f3ebe2",
    theme_color: "#1f6f78",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
