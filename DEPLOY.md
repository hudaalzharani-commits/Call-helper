# نشر Rafeeq Call Helper

المستودع: [github.com/hudaalzharani-commits/Call-helper](https://github.com/hudaalzharani-commits/Call-helper)

| الطبقة | المنصة | مجلد المشروع |
|--------|--------|----------------|
| الواجهة | **Cloudflare Pages** | `Call-helper-main/` |
| API | **Railway** | `Call-helper-main/backend/` |
| قاعدة البيانات | **MongoDB Atlas** | — |

---

## 1) MongoDB Atlas

1. أنشئ Cluster (M0 مجاني).
2. مستخدم + كلمة مرور → انسخ `MONGODB_URI`.
3. Network Access: `0.0.0.0/0` للتجربة (أو قيّد لاحقاً).
4. من جهازك (مرة واحدة):

```bash
cd Call-helper-main/backend
cp .env.example .env
# عدّل MONGODB_URI في .env
npm install
npm run seed:users
npm run seed
```

غيّر كلمات مرور `admin` / `user` بعد أول دخول.

---

## 2) Railway (الباكند)

1. [railway.app](https://railway.app) → New Project → Deploy from GitHub → اختر **Call-helper**.
2. **Settings → Root Directory:** `Call-helper-main/backend`
3. **Variables:**

| المتغير | القيمة |
|---------|--------|
| `MONGODB_URI` | رابط Atlas |
| `JWT_SECRET` | سلسلة عشوائية طويلة |
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | `https://xxx.pages.dev` (بعد Pages) |
| `JWT_EXPIRE` | `7d` (اختياري) |

4. انسخ **Public URL** للخدمة، مثلاً: `https://call-helper-production.up.railway.app`
5. اختبر: `https://YOUR-URL/api/health`

**ملاحظة:** مرفقات «علّم رفيق» تُحفظ على قرص Railway المؤقت — للإنتاج الدائم استخدم لاحقاً Cloudflare R2 أو Volume.

---

## 3) Cloudflare Pages (الواجهة)

1. [dash.cloudflare.com](https://dash.cloudflare.com) → Workers & Pages → Create → Pages → Connect GitHub → **Call-helper**.
2. **Build settings:**

| الحقل | القيمة |
|-------|--------|
| Root directory | `Call-helper-main` |
| Build command | `npm ci && npm run build` |
| Build output | `dist` |

3. **Environment variables (Production):**

| المتغير | القيمة |
|---------|--------|
| `VITE_API_BASE_URL` | `https://YOUR-RAILWAY-URL.up.railway.app/api` |
| `VITE_ENABLE_AI` | `false` |

4. Deploy → انسخ رابط Pages.
5. ارجع إلى Railway وحدّث `FRONTEND_URL` برابط Pages (بدون `/` في النهاية) → Redeploy.

---

## 4) ترتيب التشغيل

```
Atlas → Railway (MONGODB_URI) → Pages (VITE_API_BASE_URL) → FRONTEND_URL على Railway
```

---

## 5) تطوير محلي

```bash
cd Call-helper-main
npm install
cd backend && npm install && cd ..
# backend/.env من .env.example
npm run dev
```

الواجهة: `http://localhost:3000` — API عبر بروكسي `/api` → `localhost:5000`.

---

## 6) أمان

- لا ترفع `.env` أو `JWT_SECRET` إلى GitHub.
- `NODE_ENV=production` على Railway يعطّل `local-auth-token`.
- غيّر كلمات مرور seed الافتراضية فوراً.
