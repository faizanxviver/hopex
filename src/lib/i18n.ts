import { useCallback, useEffect } from "react";
import { useStore } from "@/lib/store";

/**
 * Lightweight UI dictionary. English is the source of truth; every key has a
 * full Urdu translation so switching the language localises the whole app.
 */
export const DICT = {
  en: {} as Record<string, string>,
  ur: {
    // navigation
    Home: "ہوم",
    Dashboard: "ڈیش بورڈ",
    Plans: "پلانز",
    Deposit: "ڈپازٹ",
    Withdraw: "نکلوائیں",
    Team: "ٹیم",
    Referrals: "ریفرلز",
    More: "مزید",
    Admin: "ایڈمن",
    Profile: "پروفائل",
    "Sign out": "لاگ آؤٹ",
    Notifications: "اطلاعات",
    "Mark all read": "سب پڑھا ہوا نشان زد کریں",
    "No notifications yet.": "ابھی کوئی اطلاع نہیں۔",

    // dashboard
    "Total balance": "کل بیلنس",
    "Withdrawable balance": "قابلِ نکاسی بیلنس",
    "Deposit balance": "ڈپازٹ بیلنس",
    "Referral income": "ریفرل آمدنی",
    "Live earnings": "لائیو کمائی",
    "Next payout in": "اگلی ادائیگی",
    "Auto-credited to your withdrawable balance every 24 hours.":
      "ہر 24 گھنٹے بعد خودکار طور پر آپ کے قابلِ نکاسی بیلنس میں شامل۔",
    "Activate a plan to start earning": "کمائی شروع کرنے کے لیے پلان ایکٹو کریں",
    "Your income ticker starts the moment your first plan goes live.":
      "آپ کا پہلا پلان ایکٹو ہوتے ہی کمائی شروع ہو جاتی ہے۔",
    Invest: "سرمایہ کاری",
    Refer: "ریفر کریں",
    "Promo code": "پرومو کوڈ",
    "Daily income": "روزانہ آمدنی",
    "Active plans": "فعال پلانز",
    "Good to see you": "خوش آمدید",
    "Free reward": "مفت انعام",
    "Complete one simple task and get it free": "ایک آسان ٹاسک مکمل کریں اور مفت انعام حاصل کریں",
    "Get free": "حاصل کریں",

    // common
    Amount: "رقم",
    Date: "تاریخ",
    Type: "قسم",
    Method: "طریقہ",
    Status: "اسٹیٹس",
    Details: "تفصیلات",
    Processing: "زیرِ عمل",
    Successful: "کامیاب",
    Declined: "مسترد",
    Save: "محفوظ کریں",
    Cancel: "منسوخ",
    Confirm: "تصدیق کریں",
    Search: "تلاش",
    All: "سب",
    Language: "زبان",
    "Dark mode": "ڈارک موڈ",
    "Light mode": "لائٹ موڈ",
    Preferences: "ترجیحات",
    Security: "سیکیورٹی",
    "Personal details": "ذاتی معلومات",
    "Profit calculator": "منافع کیلکولیٹر",
    "Live support chat": "لائیو سپورٹ چیٹ",
    "Help centre": "ہیلپ سینٹر",
    Wallet: "والیٹ",
    Account: "اکاؤنٹ",
    Transactions: "ٹرانزیکشنز",
    "All transactions": "تمام ٹرانزیکشنز",
    "Deposit history": "ڈپازٹ ہسٹری",
    "Withdraw history": "نکاسی ہسٹری",
    "Investment plans": "سرمایہ کاری پلانز",
    "Referral center": "ریفرل سینٹر",
    "Profile & settings": "پروفائل و سیٹنگز",
    "No transactions yet.": "ابھی کوئی ٹرانزیکشن نہیں۔",
    "Support links": "سپورٹ لنکس",
    "WhatsApp Channel": "واٹس ایپ چینل",
    "WhatsApp Group": "واٹس ایپ گروپ",
    "Support Chat": "سپورٹ چیٹ",
    "Contact Admin": "ایڈمن سے رابطہ",
    "days left": "دن باقی",
    Earned: "کمایا",
    Theme: "تھیم",
    Light: "لائٹ",
    Dark: "ڈارک",
    "Change payout account": "ادائیگی کا اکاؤنٹ تبدیل کریں",
    "Account holder name": "اکاؤنٹ ہولڈر کا نام",
    "Save account": "اکاؤنٹ محفوظ کریں",
    "Bind your payout account": "ادائیگی کا اکاؤنٹ منسلک کریں",
    "Add the JazzCash or Easypaisa account that will receive every payout.":
      "جاز کیش یا ایزی پیسہ اکاؤنٹ شامل کریں جس پر تمام ادائیگیاں موصول ہوں گی۔",
    "Once bound, withdrawals always go to this account. You can change it later in More → Profile & settings.":
      "ایک بار منسلک ہونے کے بعد، رقم ہمیشہ اسی اکاؤنٹ میں جائے گی۔ آپ اسے بعد میں مزید → پروفائل اور سیٹنگز میں تبدیل کر سکتے ہیں۔",
    "Withdraw funds": "رقم نکلوائیں",
    "Fast payouts to your bound account.": "آپ کے منسلک اکاؤنٹ میں تیز رفتار ادائیگی۔",
    "Payout window open": "نکاسی کا وقت شروع ہے",
    "Payout window closed": "نکاسی کا وقت ختم ہے",
    "Plan required": "پلان ضروری ہے",
    "Max": "زیادہ سے زیادہ",
    "No tax or fee — you receive the full amount.": "کوئی ٹیکس یا فیس نہیں — آپ پوری رقم وصول کرتے ہیں۔",
    "To change this account go to More → Profile & settings.":
      "اس اکاؤنٹ کو تبدیل کرنے کے لیے مزید → پروفائل و سیٹنگز پر جائیں۔",
    "Request withdrawal": "رقم کی درخواست کریں",
    "Withdraw rules": "نکاسی کے اصول",
    "Requests are accepted daily from": "درخواستیں روزانہ",
    "to": "سے",
    "At least one investment plan must be active.": "کم از کم ایک سرمایہ کاری پلان فعال ہونا ضروری ہے۔",
    "Minimum withdrawal is": "کم از کم نکاسی",
    "Reviewed within about 5 minutes.": "تقریباً 5 منٹ کے اندر جائزہ لیا جاتا ہے۔",
    "Declined requests are refunded instantly.": "مسترد شدہ درخواستیں فوری واپس کر دی جاتی ہیں۔",
    "Withdrawal under review": "نکاسی زیرِ جائزہ ہے",
    "Our payouts team is verifying your request.": "ہماری ٹیم آپ کی درخواست کی تصدیق کر رہی ہے۔",
    "Reviewing…": "جائزہ لیا جا رہا ہے…",

  } as Record<string, string>,
};


export function useT() {
  const { user } = useStore();
  const lang = user?.language ?? "en";

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ur" ? "rtl" : "ltr";
    return () => {
      document.documentElement.dir = "ltr";
    };
  }, [lang]);

  const t = useCallback((key: string) => (lang === "ur" ? (DICT.ur[key] ?? key) : key), [lang]);
  return { t, lang, rtl: lang === "ur" };
}
