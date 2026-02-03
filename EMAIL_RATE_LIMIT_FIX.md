# Fixing "Email Rate Limit Exceeded" Error

## Problem
Supabase limits the number of confirmation emails during development to prevent spam. This causes registration to fail with "email rate limit exceeded".

## Solution: Disable Email Confirmation (Development Only)

### Step 1: Disable Email Confirmation in Supabase

1. Go to your **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project
3. Go to **Authentication** → **Providers** (left sidebar)
4. Scroll down to **Email** provider
5. Click **Edit** or expand the Email section
6. Find **"Confirm email"** setting
7. **Toggle it OFF** (disable email confirmation)
8. Click **Save**

### Step 2: Clear Rate Limit (Optional)

If you're still seeing the error:

1. Go to **Authentication** → **Users**
2. Delete any test users you created
3. Wait a few minutes for the rate limit to reset

### Step 3: Test Registration Again

Now when you register:
- ✅ No confirmation email required
- ✅ User is immediately active
- ✅ Can login right away

## Alternative: Use Different Emails

If you want to keep email confirmation enabled:
- Use different email addresses for each test
- Use email aliases: `youremail+test1@gmail.com`, `youremail+test2@gmail.com`
- Wait for the rate limit to reset (usually 1 hour)

## For Production

> [!IMPORTANT]
> **Before deploying to production**, re-enable email confirmation:
> 1. Go to Authentication → Providers → Email
> 2. Enable "Confirm email"
> 3. Configure your email templates
> 4. Test with real email addresses

## Current Status

Your app is configured to work with or without email confirmation. The registration flow will:
1. Create the user in `auth.users`
2. Create the profile in `public.users`
3. Redirect to dashboard

No code changes needed! Just disable email confirmation in Supabase settings.
