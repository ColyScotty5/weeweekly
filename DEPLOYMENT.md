# Deployment Guide

This guide explains how to deploy your tennis tournament app to various hosting platforms.

## Quick Start

1. **Build the app for production:**
   ```bash
   npm run build
   ```

2. **The built files are in the `dist/` folder** - these are the files you need to deploy.

## Deployment Options

### Option 1: GitHub Pages (Free)

1. **Enable GitHub Pages in your repository:**
   - Go to your GitHub repository
   - Click Settings → Pages
   - Under "Source", select "Deploy from a branch"
   - Select "gh-pages" branch (we'll create this)

2. **Deploy using GitHub Actions:**
   - The `.github/workflows/deploy.yml` file is already configured
   - Just push your code to the main branch
   - GitHub will automatically build and deploy to `https://yourusername.github.io/your-repo-name`

### Option 2: Netlify (Free tier available)

1. **Connect your GitHub repository to Netlify:**
   - Go to [netlify.com](https://netlify.com)
   - Click "New site from Git"
   - Connect your GitHub repository
   - Build command: `npm run build`
   - Publish directory: `dist`

2. **Custom domain:**
   - In Netlify dashboard, go to Domain settings
   - Add your custom domain
   - Follow DNS configuration instructions

### Option 3: Vercel (Free tier available)

1. **Connect your GitHub repository to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Vercel will auto-detect Vite settings
   - Deploy automatically

### Option 4: Traditional Web Hosting

1. **Upload the `dist/` folder contents to your web server**
2. **Configure your web server to serve the `index.html` file for all routes**

## Important Notes

### Environment Variables
Make sure your Supabase configuration is set up correctly:
- Your Supabase URL and API key should be configured in `src/lib/supabase.js`
- For security, consider using environment variables in production

### Single Page Application (SPA) Routing
This app uses client-side routing. Configure your hosting platform to:
- Serve `index.html` for all routes (not just `/`)
- This prevents 404 errors when users navigate directly to app routes

### HTTPS
Your app should be served over HTTPS, especially since it uses Supabase authentication.

## Testing the Production Build Locally

You can test the production build locally:

```bash
npm run preview
```

This will serve the built files locally so you can test before deploying.

## Troubleshooting

### White Screen or Loading Issues
- Check browser console for errors
- Verify Supabase configuration
- Ensure all environment variables are set correctly

### 404 Errors on Page Refresh
- Configure your hosting platform for SPA routing
- Ensure `index.html` is served for all routes

### Build Errors
- Run `npm run build` locally first to catch any issues
- Check that all dependencies are properly installed
- Verify that your code works in development mode first
