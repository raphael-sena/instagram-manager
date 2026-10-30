import next from "eslint-config-next";

const config = [...next, { ignores: [".next/", "dist/", "drizzle/", "poc/", "next-env.d.ts"] }];

export default config;
