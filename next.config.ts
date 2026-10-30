import type { NextConfig } from "next";

const config: NextConfig = {
  // imagem Docker enxuta: só o servidor e as dependências rastreadas (ver Dockerfile)
  output: "standalone",
  poweredByHeader: false,
};

export default config;
