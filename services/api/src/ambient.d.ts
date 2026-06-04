// Ambient module shims for packages that ship without type declarations.
// This file has NO top-level import/export on purpose: that keeps it a global
// script so `declare module "x"` acts as an ambient shorthand (typed `any`)
// rather than a module augmentation. Avoids adding @types/* dev dependencies.

declare module "jsonwebtoken";
declare module "openid";
