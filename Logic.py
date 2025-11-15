# -*- coding: utf-8 -*-

"""
Logic.py
ملف اللوجيك الرئيسي للكول هيلبر
- يجمع المدخلات من الموظف
- يختار الإيجنت المناسب داخلياً
- يرسل الوصف للإيجنت
- يطبع النتيجة للموظف
"""

from datetime import date
from agent.UmrahAgent import UmrahAgent


# =========================
# دالة اختيار الإيجنت المناسب
# =========================
def get_agent_for_user(user_type: str):
    """
    تختار الإيجنت المناسب حسب نوع المستخدم.
    هذه العملية داخلية، ما تظهر للمستخدم.
    """

    normalized = (user_type or "").strip()

    # كل ما له علاقة بالعمرة → يروح لإيجنت العمرة
    if "عمرة" in normalized or "شركة عمرة" in normalized or "وكيل خارجي" in normalized:
        return UmrahAgent()

    # لو ما لقينا إيجنت مناسب نرجّع None
    return None


# ==============
# الدالة الرئيسية
# ==============
def main():
    # تاريخ اليوم (للسجلّات أو اللوجز)
    today = date.today()
    print("تاريخ اليوم:", today)

    # -------- المدخلات من الموظف --------
    client_name = input("اسم العميل : ")
    user_type = input("نوع المستخدم (شركة عمرة / وكيل خارجي / مقدم خدمة) : ")
    issue_description = input("وصف المشكلة : ")

    # -------- اختيار الإيجنت داخلياً --------
    agent = get_agent_for_user(user_type)

    if agent is None:
        # رد عام محترم
        response_text = (
            "حالياً النظام مدرَّب على فئة محددة من المستخدمين فقط.\n"
            "يرجى التأكد من كتابة نوع المستخدم بشكل صحيح."
        )

        print("\n--- النتيجة ---")
        print("اسم العميل :", client_name)
        print("نوع المستخدم :", user_type)
        print("الرد :", response_text)
        return

    # -------- البحث في قاعدة المعرفة عبر الإيجنت --------
   
    best_row, status_msg = agent.find_best_row(issue_description)

    print("\n--- النتيجة ---")
    print("اسم العميل :", client_name)
    print("نوع المستخدم :", user_type)

    if best_row is None:
        # ما لقينا حالة مناسبة في الداتا
        print("الحالة :", status_msg)
        print("الرد :", "نحتاج تفاصيل أكثر عن المشكلة أو تسجيلها كحالة جديدة في النظام.")
    else:
        # نفترض أن best_row هي Series من pandas فيها الأعمدة
        print("الحالة :", status_msg)
        print("التصنيف :", best_row.get("Category", ""))
        print("التصنيف الفرعي :", best_row.get("SubCategory", ""))
        print("درجة المطابقة :", best_row.get("MatchScore", ""))  
        print("الرد المقترح :")
        print(best_row.get("ResponseText", ""))


# تشغيل الملف مباشرة
if __name__ == "__main__":
    main()
