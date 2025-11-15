# -*- coding: utf-8 -*-

# UmrahAgent.py

try:
    import pandas as pd
except Exception as _pandas_err:
    # Stub بسيط لو باندا غير متوفرة (للفيوتشِر أو للديبغ)
    class _PandasStub:
        @staticmethod
        def read_excel(*args, **kwargs):
            raise ImportError("pandas is not installed. Install it with 'pip install pandas'")
    pd = _PandasStub()

from .SmartAgent import SmartAgent  

# اسم ملف الإكسل وشيت العمرة
FILE_NAME = "CallHelper_Data.xlsx"
UMRAH_SHEET = "Callhelper.Umrah"


class UmrahAgent(SmartAgent):
    def __init__(self):
        super().__init__()

        try:
            # نقرأ بيانات شيت العمرة مرة وحدة
            self.df = pd.read_excel(FILE_NAME, sheet_name=UMRAH_SHEET)

            # نبدّل NaN بسلاسل فاضية عشان ما نتعب في السترنق
            self.df = self.df.fillna("")

            # لو عندنا عمود AccountStatus نخلي بس الـ active
            if "AccountStatus" in self.df.columns:
                mask = self.df["AccountStatus"].astype(str).str.lower() == "active"
                self.df = self.df[mask].copy()

            # Debug بسيط
            print(
                "DEBUG UmrahAgent:",
                "rows =", len(self.df),
                "cols =", list(self.df.columns),
            )

        except Exception as e:
            self.df = None
            self.log_error(e)

    # ============================
    # هل هذا الإيجنت يدعم نوع المستخدم؟
    # ============================
    def is_supported_user(self, user_type: str) -> bool:
        user_type = self.preprocess(user_type)
        # نسمح بـ "شركة عمرة" و "وكيل خارجي"
        return ("شركة عمرة" in user_type) or ("وكيل خارجي" in user_type)

       # ============================
    # دالة إيجاد أفضل صف من الداتا
    # ============================
    def find_best_row(self, issue_text: str):
        # لو ما قدرنا نقرأ الإكسل
        if self.df is None or self.df.empty:
            return None, "خطأ في قراءة بيانات العمرة. يرجى التحقق من ملف الإكسل."

        issue_text = self.preprocess(issue_text)

        if not issue_text:
            return None, "ما وصلنا وصف كافي للمشكلة."

        best_row = None
        best_score = -1

        # نخلي النص حق المشكلة على شكل كلمات + نستخدمه كنص كامل
        issue_words = set(issue_text.split())

        for _, row in self.df.iterrows():
            main = self.preprocess(str(row.get("MainKeywords", "")))
            extra = self.preprocess(str(row.get("ExtraKeywords", "")))
            neg = self.preprocess(str(row.get("NegativeKeywords", "")))

            # نحول القوائم لكلمات منفصلة (تفصل على الفراغ أو الفاصلة العربية)
            def to_words(text):
                text = text.replace("،", " ")
                return [w for w in text.split() if w]

            main_words = to_words(main)
            extra_words = to_words(extra)
            neg_words = to_words(neg)

            # لو أي كلمة سلبية ظهرت في المشكلة → نتجاوز هذا الصف
            if any(w in issue_words for w in neg_words):
                continue

            score = 0

            # نحسب السكور بطريقة مرنة:
            # لو الكلمة موجودة ضمن النص (مو لازم تطابق 100%)
            for w in main_words:
                if w and w in issue_text:
                    score += 2
            for w in extra_words:
                if w and w in issue_text:
                    score += 1

            # نضيف أولوية لو حطيتي أرقام في عمود Priority
            priority_raw = str(row.get("Priority", "")).strip()
            try:
                priority_val = int(priority_raw) if priority_raw else 0
            except ValueError:
                priority_val = 0
            score += priority_val

            if score > best_score:
                best_score = score
                best_row = row

        # لو ما لقينا سكور قوي، ما راح نطيح في fallback الفاضي
        if best_row is None or best_score <= 0:
            # للعرض (Demo): نرجّع أول صف من الشيت عشان يبان الربط مع ResponseText
            fallback = self.df.iloc[0].copy()
            fallback["MatchScore"] = 0
            return fallback, "ما لقينا تطابق واضح، عرضنا أقرب حالة متاحة (للـ Demo)."

        best_row = best_row.copy()
        best_row["MatchScore"] = best_score
        return best_row, "تم العثور على حالة مناسبة في قاعدة البيانات."

