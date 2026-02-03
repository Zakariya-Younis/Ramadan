# Database Setup Instructions

## Step 1: Execute the Schema

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: **tzrljvsvubosyyrbuqrn**
3. Go to **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy and paste the entire content from `supabase/schema.sql`
6. Click **Run** or press `Ctrl+Enter`

## Step 2: Verify Tables Were Created

1. Go to **Table Editor** (left sidebar)
2. You should see three tables:
   - `users`
   - `questions`
   - `attempts`

## Step 3: Check if Trigger Works

The schema includes a trigger that automatically creates a user record in `public.users` when a new user signs up in `auth.users`.

**To test:**
1. Register a new user in your app
2. Go to Supabase Dashboard → **Table Editor** → `users` table
3. Check if the user appears

**If the trigger doesn't work** (user not appearing in `users` table):
- Don't worry! The registration code has a fallback that manually creates the user record
- This is already implemented in the app

## Step 4: Create Your First Admin User

After registering your first user:

1. Go to Supabase Dashboard → **SQL Editor**
2. Run this query (replace with your email):

```sql
UPDATE users 
SET role = 'admin' 
WHERE email = 'your-email@example.com';
```

3. Now you can access:
   - `/admin/questions` - Add and manage quiz questions
   - `/admin/users` - View all registered users

## Troubleshooting

### Users not appearing in the database?
- The app now handles user creation automatically in the code
- Even if the trigger fails, users will be created
- Check the browser console for any errors

### Can't access admin pages?
- Make sure you've updated your user role to 'admin' using the SQL query above
- Sign out and sign back in after changing the role

### Questions not showing in quiz?
- Go to `/admin/questions` and add a question
- Set the `active_date` to today's date
- The quiz will automatically show questions for the current date
