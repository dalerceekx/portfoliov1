process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ??= 'postgresql://user:pass@localhost:5432/portfolio_test?schema=public';
process.env.JWT_ACCESS_SECRET ??= 'test_secret_that_is_definitely_long_enough_1234';
process.env.CORS_ORIGIN ??= 'http://localhost:5173';
process.env.PUBLIC_SITE_URL ??= 'http://localhost:5173';
