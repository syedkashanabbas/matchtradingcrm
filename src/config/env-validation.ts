import dotenv from 'dotenv';

dotenv.config();

interface EnvVars {
  DATABASE_URL: string;
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  ENCRYPTION_KEY: string;
  CLIENT_URL: string;
  PORT?: string;
}

const requiredEnvVars: (keyof EnvVars)[] = [
  'DATABASE_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'ENCRYPTION_KEY',
  'CLIENT_URL'
];

export function validateEnv(): void {
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => console.error(`   - ${varName}`));
    process.exit(1);
  }

  console.log('✅ Environment variables validated');
}

export const env = {
  DATABASE_URL: process.env.DATABASE_URL!,
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET!,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET!,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY!,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET!,
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY!,
  CLIENT_URL: process.env.CLIENT_URL!,
  // Referral links (D7) - falls back to CLIENT_URL
  REFERRAL_BASE_URL: process.env.REFERRAL_BASE_URL || process.env.CLIENT_URL!,
  PORT: process.env.PORT || '5000',
  NODE_ENV: process.env.NODE_ENV || 'development'
};
