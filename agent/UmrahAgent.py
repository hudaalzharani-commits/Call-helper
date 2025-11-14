try:
    import pandas as pd
except Exception as _pandas_err:
    # Fallback stub when pandas is not available. The real import error
    # will be raised when trying to use read_excel, which is handled
    # inside the class initializer to log the error gracefully.
    class _PandasStub:
        @staticmethod
        def read_excel(*args, **kwargs):
            raise ImportError(
                "pandas is not installed. Install it with 'pip install pandas'"
            ) from _pandas_err

    pd = _PandasStub()

from .SmartAgent import SmartAgent

# اسم ملف الإكسل وشيت العمرة
FILE_NAME = "CallHelper_Data.xlsx"
UMRAH_SHEET = "CallHelper.Umrah"  

class UmrahAgent(SmartAgent):
    def __init__(self):
        super().__init__()
        try:
            # نقرأ بيانات شيت العمرة مرة وحدة
            self.df = pd.read_excel(FILE_NAME, sheet_name=UMRAH_SHEET)
        except Exception as e:
            self.df = None
            self.log_error(e)

    def is_supported_user(self, user_type: str) -> bool:
    
        user_type = self.preprocess(user_type)
        return ("شركة عمره" in user_type) or ("وكيل خارجي" in user_type)

    def find_best_row(self, issue_text: str):
       
        if self.df is None or self.df.empty:
            return None, self.message("error")

        issue_text = self.preprocess(issue_text)

        if not issue_text:
            return None, self.message("missing")

        best_row = None
        best_score = 0

        for _, row in self.df.iterrows():
            score = 0

            main = self.preprocess(str(row.get("MainKeywords", "")))
            extra = self.preprocess(str(row.get("ExtraKeywords", "")))
            neg = self.preprocess(str(row.get("NegativeKeywords", "")))

            # 1) لو كلمة ماتتطابق → نستبعد السطر
            if neg:
                for kw in neg.split(","):
                    kw = kw.strip()
                    if kw and kw in issue_text:
                        score = -1
                        break
                if score == -1:
                    continue

            # 2) الكلمات الرئيسية (MainKeywords) 
            for kw in main.split(","):
                kw = kw.strip()
                if kw and kw in issue_text:
                    score += 2

            # 3) الكلمات الإضافية (ExtraKeywords)
            for kw in extra.split(","):
                kw = kw.strip()
                if kw and kw in issue_text:
                    score += 1

            if score > best_score:
                best_score = score
                best_row = row

        if not best_row or best_score == 0:
            return None, self.message("no_match")

        return best_row, self.message("success")