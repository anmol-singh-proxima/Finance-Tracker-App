/// <reference types="vite/client" />

interface ImportMetaEnv {
  // 'local' (default) → DB-backed auth via the backend; 'cognito' → Amazon Cognito.
  readonly VITE_AUTH_PROVIDER?: 'local' | 'cognito';
  // Required only when VITE_AUTH_PROVIDER=cognito.
  readonly VITE_COGNITO_USER_POOL_ID?: string;
  readonly VITE_COGNITO_CLIENT_ID?: string;
  readonly VITE_COGNITO_REGION?: string;
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
