# مسارات التطبيق (Application Routes)

## ✅ **المسارات الصحيحة الموجودة في التطبيق**

### 🔓 **صفحات عامة** (Public Pages)
| المسار | الوصف | الملف |
|--------|-------|------|
| `/` | الصفحة الرئيسية (تحول تلقائياً إلى `/login`) | [page.tsx](file:///d:/apps/Ramadan/app/page.tsx) |
| `/login` | تسجيل الدخول | [login/page.tsx](file:///d:/apps/Ramadan/app/(auth)/login/page.tsx) |
| `/register` | إنشاء حساب جديد | [register/page.tsx](file:///d:/apps/Ramadan/app/(auth)/register/page.tsx) |

### 👤 **صفحات المستخدم** (User Pages)
| المسار | الوصف | الملف |
|--------|-------|------|
| `/dashboard` | لوحة التحكم الرئيسية | [dashboard/page.tsx](file:///d:/apps/Ramadan/app/(user)/dashboard/page.tsx) |
| `/quiz` | صفحة الاختبار اليومي | [quiz/page.tsx](file:///d:/apps/Ramadan/app/(user)/quiz/page.tsx) |
| `/leaderboard` | لوحة المتصدرين | [leaderboard/page.tsx](file:///d:/apps/Ramadan/app/(user)/leaderboard/page.tsx) |

### 👑 **صفحات الأدمن** (Admin Pages)
| المسار | الوصف | الملف |
|--------|-------|------|
| `/admin/questions` | إدارة الأسئلة | [admin/questions/page.tsx](file:///d:/apps/Ramadan/app/admin/questions/page.tsx) |
| `/admin/users` | إدارة المستخدمين | [admin/users/page.tsx](file:///d:/apps/Ramadan/app/admin/users/page.tsx) |

---

## 🔒 **الحماية والصلاحيات**

### المستخدم غير المسجل (Not Logged In)
- ✅ يمكنه الوصول: `/login`, `/register`
- ❌ يُحوّل تلقائياً إلى `/login` إذا حاول الوصول إلى:
  - `/dashboard`
  - `/quiz`
  - `/leaderboard`
  - `/admin/*`

### المستخدم العادي (role = 'user')
- ✅ يمكنه الوصول:
  - `/dashboard`
  - `/quiz`
  - `/leaderboard`
- ❌ يُحوّل إلى `/dashboard` إذا حاول الوصول إلى:
  - `/admin/questions`
  - `/admin/users`
- ❌ يُحوّل إلى `/dashboard` إذا حاول الوصول إلى:
  - `/login` (لأنه مسجل دخول بالفعل)
  - `/register` (لأنه مسجل دخول بالفعل)

### الأدمن (role = 'admin')
- ✅ يمكنه الوصول إلى **جميع المسارات**:
  - `/dashboard`
  - `/quiz`
  - `/leaderboard`
  - `/admin/questions`
  - `/admin/users`

---

## 🧪 **اختبار المسارات**

### للمستخدم العادي:
```
✅ http://localhost:3000/dashboard
✅ http://localhost:3000/quiz
✅ http://localhost:3000/leaderboard
❌ http://localhost:3000/admin/questions → يحول إلى /dashboard
❌ http://localhost:3000/admin/users → يحول إلى /dashboard
```

### للأدمن:
```
✅ http://localhost:3000/dashboard
✅ http://localhost:3000/quiz
✅ http://localhost:3000/leaderboard
✅ http://localhost:3000/admin/questions
✅ http://localhost:3000/admin/users
```

---

## 📁 **هيكل المجلدات**

```
app/
├── (auth)/              # مجموعة صفحات المصادقة
│   ├── login/
│   │   └── page.tsx
│   └── register/
│       └── page.tsx
├── (user)/              # مجموعة صفحات المستخدم
│   ├── dashboard/
│   │   └── page.tsx
│   ├── quiz/
│   │   └── page.tsx
│   └── leaderboard/
│       └── page.tsx
├── admin/               # مجموعة صفحات الأدمن
│   ├── questions/
│   │   └── page.tsx
│   └── users/
│       └── page.tsx
├── layout.tsx           # التخطيط الرئيسي (RTL + Arabic)
├── globals.css          # الأنماط العامة
└── page.tsx             # الصفحة الرئيسية (/)
```

---

## ✅ **التأكيد النهائي**

جميع المسارات موجودة وتعمل بشكل صحيح:
- ✅ 2 صفحة مصادقة (login, register)
- ✅ 3 صفحات مستخدم (dashboard, quiz, leaderboard)
- ✅ 2 صفحة أدمن (questions, users)
- ✅ الحماية مفعلة على جميع المسارات
- ✅ التحقق من الدور (role) يعمل بشكل صحيح

**كل شيء جاهز ويعمل! 🎉**
