# How to Login as Admin

## Step 1: Register a Regular User First

1. Go to http://localhost:3000
2. Click **"سجل الآن"** (Register Now)
3. Fill in:
   - **الاسم** (Name): Your name
   - **البريد الإلكتروني** (Email): Your email (e.g., `admin@example.com`)
   - **كلمة المرور** (Password): Your password (min 6 characters)
4. Click **"إنشاء حساب"** (Create Account)
5. You'll be redirected to the dashboard

## Step 2: Make Yourself Admin in Supabase

1. Go to **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project: **tzrljvsvubosyyrbuqrn**
3. Go to **SQL Editor** (left sidebar)
4. Click **New Query**
5. Paste this SQL (replace with your email):

```sql
UPDATE users 
SET role = 'admin' 
WHERE email = 'admin@example.com';
```

6. Click **Run** or press `Ctrl+Enter`
7. You should see: **Success. No rows returned**

## Step 3: Verify the Change

1. In Supabase, go to **Table Editor** → **users** table
2. Find your user
3. Check that the **role** column shows `admin`

## Step 4: Sign Out and Sign Back In

1. In your app, click **"تسجيل الخروج"** (Sign Out)
2. Login again with your email and password
3. You now have admin access!

## Step 5: Access Admin Pages

Now you can access:

- **Question Management**: http://localhost:3000/admin/questions
  - Add daily quiz questions
  - Set active dates
  - Delete questions

- **User Management**: http://localhost:3000/admin/questions
  - View all registered users
  - See user roles and registration dates

## Quick Reference

### Admin Routes:
- `/admin/questions` - إدارة الأسئلة (Question Management)
- `/admin/users` - إدارة المستخدمين (User Management)

### SQL to Make User Admin:
```sql
UPDATE users SET role = 'admin' WHERE email = 'YOUR_EMAIL_HERE';
```

### SQL to Remove Admin Role:
```sql
UPDATE users SET role = 'user' WHERE email = 'YOUR_EMAIL_HERE';
```

## Troubleshooting

### Can't access admin pages?
- Make sure you've run the SQL UPDATE query
- Sign out and sign back in
- Check the `users` table to verify role is 'admin'

### Admin pages redirect to dashboard?
- The middleware checks your role from the database
- Ensure the role update was successful
- Clear browser cache and try again

### Want to create multiple admins?
Run the UPDATE query for each email:
```sql
UPDATE users SET role = 'admin' WHERE email IN ('admin1@example.com', 'admin2@example.com');
```
