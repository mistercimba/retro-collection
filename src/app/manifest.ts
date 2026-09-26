import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mário's Retro Collection",
    short_name: "Retro Collection",
    description: "Consulta rápida da coleção de videojogos retro.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#142f51",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
