# MarryLocal - React + Vite

This is the MarryLocal application built with React and Vite.

## Setup

1. Clone the repository
2. Copy `.env.example` to `.env` and fill in your environment variables
3. Install dependencies: `npm install`
4. Start development server: `npm run dev`

## Environment Variables

Copy `.env.example` to `.env` and configure the following variables:

- `VITE_CRYPTO_SECRET`: Secret key for encryption
- `VITE_RESEND_API_KEY`: API key for Resend email service
- `VITE_TOKEN_KEY`: Key for token encryption
- `VITE_MARRYLOCAL_URL`: Application URL (localhost for dev, production URL for prod)

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## React Compiler

The React Compiler is currently not compatible with SWC. See [this issue](https://github.com/vitejs/vite-plugin-react/issues/428) for tracking the progress.

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

