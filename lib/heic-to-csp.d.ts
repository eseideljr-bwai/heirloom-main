/**
 * `heic-to/csp` is a package sub-path export. Next's bundler resolves it, but
 * this tsconfig's `moduleResolution: "node"` can't see sub-path types, so
 * point TypeScript at the package's main types (the CSP build's .d.ts is
 * identical). Used by lib/image-normalize.ts.
 */
declare module 'heic-to/csp' {
  export * from 'heic-to';
}
