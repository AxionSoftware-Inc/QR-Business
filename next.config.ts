import type { NextConfig } from "next";

const isDev=process.env.NODE_ENV!=="production";
const csp=[
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev?" 'unsafe-eval'":""} https://accounts.google.com`,
  "style-src 'self' 'unsafe-inline' https://accounts.google.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https: http://127.0.0.1:8000 http://localhost:8000",
  "frame-src https://accounts.google.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders=[
  {key:"Content-Security-Policy",value:csp},
  {key:"Referrer-Policy",value:"strict-origin-when-cross-origin"},
  {key:"Permissions-Policy",value:"camera=(), microphone=(), geolocation=(), payment=()"},
  {key:"X-Content-Type-Options",value:"nosniff"},
  {key:"X-Frame-Options",value:"DENY"},
];

const nextConfig:NextConfig={
  skipTrailingSlashRedirect:true,
  async headers(){return[{source:"/(.*)",headers:securityHeaders}];},
};

export default nextConfig;
