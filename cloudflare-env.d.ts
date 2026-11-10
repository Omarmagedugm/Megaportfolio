declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
  }
}
declare namespace Cloudflare {interface Env {ADMIN_EMAIL?:string;ADMIN_PASSWORD_HASH?:string;ADMIN_PASSWORD_SALT?:string;}}
