# بوابة واتساب المحلية (تشغيل مجاني من رقم الاتحاد)

> تعمل على جهاز الأدمن فقط — لا تُرفع على Vercel.

## التشغيل: دابل كليك على `DNU-WhatsApp.exe`

1. شغّل الملف — ستظهر نافذة سوداء فيها QR.
2. امسح الـ QR من واتساب الرقم اللي عايزه يبعت:
   واتساب → الإعدادات → الأجهزة المرتبطة → ربط جهاز.
   (مفيش رقم مكتوب في أي ملف — الرقم = اللي مسح الـ QR.)
3. بعد `WhatsApp connected.` سيب النافذة مفتوحة طول فترة الإرسال.

كلمة السر مدمجة في التطبيق — السيستم مربوط عليها تلقائياً.

## تغيير رقم الإرسال

امسح فولدر `auth` اللي جنب الـ EXE وشغّله تاني — هيطلع QR جديد امسحه من الرقم الجديد.

## للمطورين (إعادة بناء الـ EXE بعد تعديل server.js)

```bash
cd gateway
npm install
npx esbuild server.js --bundle --platform=node --format=cjs --outfile=gateway.bundle.cjs "--banner:js=try{if(!globalThis.crypto||!globalThis.crypto.subtle){globalThis.crypto=require('crypto').webcrypto;}}catch(e){}"
npx pkg gateway.bundle.cjs --targets node18-win-x64 --output DNU-WhatsApp.exe
```

## تغيير رقم الإرسال

الرقم مش ثابت — في أي وقت عايز رقم تاني يبعت:

```powershell
cd gateway
.\change-number.ps1
```

هيمسح الجلسة القديمة ويطلع QR جديد — امسحه من الرقم الجديد. بس كده.

## الإرسال من السيستم

1. في `.env.local` (على نفس الجهاز) أضف:
   ```
   WHATSAPP_GATEWAY_URL=http://localhost:3001
   WHATSAPP_GATEWAY_SECRET=نفس-القيمة-هنا-وفي-Baileys
   ```
2. شغّل البوابة مع `GATEWAY_SECRET` بنفس القيمة:
   ```bash
   # Windows PowerShell
   $env:GATEWAY_SECRET="قيمة-سرية-مشتركة"; node server.js
   ```
3. افتح أي حملة في `/communication/[id]` واضغط **إرسال تلقائي للكل**.

## ملاحظات أمان الرقم

- السيستم يبعت بسرعة `WHATSAPP_RATE_PER_MINUTE` (الافتراضي 40 رسالة/دقيقة).
- ابدأ بدفعات صغيرة (50–100) قبل الحملات الكبيرة.
- الأفضل رقم احتياطي للاتحاد، وليس الرقم الشخصي.
- أول تسجيل دخول يحفظ الجلسة في `gateway/auth` — لا تحذفه ولا تشاركه.
