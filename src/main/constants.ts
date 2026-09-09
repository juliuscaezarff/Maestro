// Dev mode detection
export const IS_DEV = !!process.env.ELECTRON_RENDERER_URL

// Custom URL scheme used by the web app to return authentication to desktop.
export const DESKTOP_PROTOCOL = IS_DEV ? "instructor-dev" : "instructor"

// Auth server port - use different port in dev to allow running alongside production
export const AUTH_SERVER_PORT = IS_DEV ? 21322 : 21321
