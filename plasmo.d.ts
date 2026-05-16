declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: "development" | "production";
    PLASMO_BROWSER?: string;
    PLASMO_MANIFEST_VERSION?: "mv2" | "mv3";
    PLASMO_TARGET?: string;
    PLASMO_TAG?: string;
  }
}

declare module "*.module.css";
declare module "react:*";
