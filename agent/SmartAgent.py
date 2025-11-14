import re
import datetime
import traceback
import os
import smtplib
from email.mime.text import MIMEText
from collections import Counter


class SmartAgent:
    def __init__(self):
        # ملف اللوق
        self.log_file = "agent_logs.txt"

        # إعدادات التنبيه 
        self.alert_email = ""  # إيميل التنبيهات (لسا ماسويته)
        self.alert_threshold = 3  # لو نفس الخطأ تكرر 3 مرات في نفس اليوم → تنبيه

        # نقرأ باسورد التطبيق من متغير بيئة، ما نحطه هارد كود
        self.email_password = os.environ.get("CALLHELPER_APP_PASSWORD", "")

    #  تنظيف النص
    def preprocess(self, text: str) -> str:
        if not text:
            return ""
        text = text.strip().lower()
        text = re.sub(r"[^\w\s\u0600-\u06FF]", " ", text)
        text = re.sub(r"\s+", " ", text)
        return text

    #  رسائل رفيق الموحدة
    def message(self, key: str) -> str:
        messages = {
            "missing": "الوصف غير مكتمل، أضف تفاصيل أكثر ",
            "invalid": "التنسيق غير واضح، حاول تكتبه بطريقة أوضح.",
            "no_match": "ما قدرت أحدد الحالة بدقة، ممكن توضح المشكلة بكلمات ثانية؟",
            "error": "حدث خطأ غير متوقع وتم تسجيله للمراجعة",
            "success": "تمت معالجة الطلب بنجاح ",
            "processing": "جاري تحليل المدخلات. لحظة "
        }
        return messages.get(key, "حدث خطأ غير متوقع، يرجى المحاولة لاحقًا.")

    #  التحقق من المدخلات
    def validate_input(self, user_type: str, issue_text: str):
        if not user_type or not issue_text:
            return False, self.message("missing")

        clean_issue = self.preprocess(issue_text)
        if len(clean_issue) < 5:
            return False, "الوصف قصير جدًا، فضلاً أضف تفاصيل أكثر."

        return True, self.message("success")

    #  تسجيل الأخطاء + مراقبة التكرار
    def log_error(self, error: Exception, enable_alert: bool = True):
        try:
            now = datetime.datetime.now()
            date_today = now.strftime("%Y-%m-%d")
            error_type = type(error).__name__

            # نكتب في ملف اللوق
            with open(self.log_file, "a", encoding="utf-8") as f:
                f.write(f"[{now}] {error_type}: {error}\n")
                f.write("-" * 60 + "\n")

            # نحسب تكرار الأخطاء من نفس النوع اليوم
            with open(self.log_file, "r", encoding="utf-8") as f:
                lines = f.readlines()

            errors_today = [
                line for line in lines
                if line.startswith("[") and date_today in line
            ]

            types_today = []
            for line in errors_today:
                # مثال سطر: [2025-11-11 22:10:01.123456] ValueError: message
                try:
                    after_time = line.split("]", 1)[1].strip()
                    etype = after_time.split(":", 1)[0].strip().split()[0]
                    types_today.append(etype)
                except Exception:
                    continue

            count = Counter(types_today)[error_type]

            # لو تخطى الحد و التنبيهات مفعّلة و فيه إعدادات إيميل → نرسل تنبيه
            if (
                enable_alert
                and self.alert_email
                and self.email_password
                and count >= self.alert_threshold
            ):
                self.send_email_alert(error_type, count)

        except Exception:
            # ما نرمي خطأ جديد لو تسجيل اللوق نفسه فشل
            pass

    #  إرسال تنبيه بالإيميل (ما يستدعي log_error عشان ما ندخل حلقة)
    def send_email_alert(self, error_type: str, count: int):
        try:
            msg = MIMEText(
                f"تنبيه \n\n"
                f"تم تكرار الخطأ من النوع: {error_type} عدد {count} مرات اليوم.\n"
                f"يرجى مراجعة نظام Smart Call Helper / SmartAgent.\n"
            )
            msg["Subject"] = f" تنبيه تكرار خطأ: {error_type}"
            msg["From"] = self.alert_email
            msg["To"] = self.alert_email

            with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
                server.login(self.alert_email, self.email_password)
                server.send_message(msg)

        except Exception:
            # لو فشل الإرسال، نتجاهل هنا (ما نستدعي log_error عشان ما يصير تنبيه على التنبيه)
            pass

    #  توليد تقرير أسبوعي CSV من اللوق
    def generate_weekly_report(self, days: int = 7):
        """
        يقرأ ملف اللوق ويطلع تقرير بعدد الأخطاء لكل يوم ولكل نوع خطأ.
        يحفظه في ملف: agent_error_report.csv
        """
        if not os.path.exists(self.log_file):
            return "ما فيه سجل أخطاء حتى الآن."

        try:
            cutoff_date = datetime.datetime.now() - datetime.timedelta(days=days)
            summary = {}  # {(date, error_type): count}

            with open(self.log_file, "r", encoding="utf-8") as f:
                for line in f:
                    if not line.startswith("["):
                        continue
                    try:
                        timestamp_str, rest = line.split("]", 1)
                        timestamp_str = timestamp_str.strip("[")
                        dt = datetime.datetime.fromisoformat(timestamp_str)
                        if dt < cutoff_date:
                            continue

                        after_time = rest.strip()
                        error_type = after_time.split(":", 1)[0].strip().split()[0]

                        key = (dt.date().isoformat(), error_type)
                        summary[key] = summary.get(key, 0) + 1
                    except Exception:
                        continue

            # نكتب التقرير في CSV بسيط
            report_file = "agent_error_report.csv"
            with open(report_file, "w", encoding="utf-8") as f:
                f.write("date,error_type,count\n")
                for (date_str, etype), cnt in sorted(summary.items()):
                    f.write(f"{date_str},{etype},{cnt}\n")

            return f"تم إنشاء تقرير الأخطاء في {report_file}"

        except Exception as e:
            self.log_error(e, enable_alert=False)
            return "حدث خطأ أثناء إنشاء تقرير الأخطاء."

    # نقطة الدخول العامة لتحليل المدخلات
    def analyze_input(self, user_type: str, issue_text: str) -> str:
        try:
            is_valid, msg = self.validate_input(user_type, issue_text)
            if not is_valid:
                return msg

            # هنا المنطق العام لو مافي Agent متخصص أو ما لقى تطابق
            return self.message("no_match")

        except Exception as e:
            self.log_error(e)
            return self.message("error")