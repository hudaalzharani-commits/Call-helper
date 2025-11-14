# -*- coding: utf-8 -*-
# UmrahAgent.py

import pandas as pd
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
            # اختيارياً: تطمين إن الملف انقرأ صح
            # print("DEBUG: rows =", len(self.df), "cols =", list(self.df.columns))
        except Exception as e:
            self.df = None
            self.log_error(e)

    # هذا الإيجنت مسؤول عن "شركة عمرة" و "وكيل خارجي"
    def is_supported_user(self, user_type: str) -> bool:
        user_type = self.preprocess(user_type)
        return ("شركة عمرة" in user_type) or ("وكيل خارجي" in user_type)

    # قلب الإيجنت: نبحث عن أفضل صف يطابق وصف المشكلة
    def find_best_row(self, issue_text: str):
        # لو الإكسل مو محمّل
        if self.df is None or self.df.empty:
            return None, self.message("error")

        issue_text_proc = self.preprocess(issue_text)
        if not issue_text_proc:
            return None, self.message("missing")

        best_row = None
        best_score = 0

        for _, row in self.df.iterrows():
            main = self.preprocess(row.get("MainKeywords", ""))
            extra = self.preprocess(row.get("ExtraKeywords", ""))
            syn = self.preprocess(row.get("Synonyms", ""))
            neg = self.preprocess(row.get("NegativeKeywords", ""))

            score = 0

            # دالة صغيرة لحساب النقاط من قائمة كلمات
            def add_score(keywords: str, weight: int):
                nonlocal score
                for word in keywords.replace("،", " ").split():
                    w = word.strip()
                    if w and w in issue_text_proc:
                        score += weight

            # لو أي كلمة سلبية ظهرت → نطنّش هذا الصف
            has_negative = False
            for word in neg.replace("،", " ").split():
                w = word.strip()
                if w and w in issue_text_proc:
                    has_negative = True
                    break
            if has_negative:
                continue

            # نحسب نقاط المطابقة
            add_score(main, 3)   # الكلمات الأساسية أثقل
            add_score(extra, 2)  # كلمات إضافية
            add_score(syn, 1)    # مرادفات

            if score > best_score:
                best_score = score
                # ننسخ الصف عشان نضيف فيه درجة المطابقة
                row_copy = row.copy()
                row_copy["MatchScore"] = score
                best_row = row_copy

        if best_row is None or best_score == 0:
            return None, self.message("no_match")

        return best_row, "matched"
