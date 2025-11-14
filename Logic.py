# -*- coding: utf-8 -*-
"""
Logic.py
ملف اللوجيك الرئيسي للكول هيلبر
- يجمع المدخلات من الموظف
- يختار الإيجنت المناسب داخليًا
- يرسل الوصف للإيجنت
- يطبع النتيجة للموظف (للتجارب حالياً)
"""
#this comment by Shams
from datetime import date

# حالياً نستخدم إيجنت العمرة فقط
from agent.UmrahAgent import UmrahAgent
# مستقبلاً:
# from agent.HajjExAgent import HajjExAgent
# from agent.HajjLoAgent import HajjLoAgent


# =========================
# دالة اختيار الإيجنت المناسب
# =========================
def get_agent_for_user(user_type: str):
    
   # تختار الإيجنت المناسب حسب نوع المستخدم.
    #هذه العملية داخلية، ما تظهر للمستخدم.
    

    normalized = (user_type or "").strip().lower()

    # كل ما له علاقة بالعمرة يروح لإيجنت العمرة
    if "عمره" in normalized or "عمرة" in normalized:
        return UmrahAgent()

    # مثال مستقبلي:
    # if "حج" in normalized and "خارج" in normalized:
    #     return HajjExAgent()
    #
    # if "حج" in normalized and " in normalized:
    #     return HajjLoAgent()

    # لو ما لقينا إيجنت مناسب نرجّع None
    return None


# ==============
# الدالة الرئيسية
# ==============
def main():
    # تاريخ اليوم (للسجلات أو اللوقز)
    today = date.today()
    print("تاريخ اليوم :", today)

    # -------- المدخلات من الموظف --------
    client_name = input("اسم العميل : ")
    user_type = input("نوع المستخدم (شركة عمرة / وكيل خارجي / مقدم خدمة) : ")
    issue_description = input("وصف المشكلة : ")

    # -------- اختيار الإيجنت داخلياً --------
    agent = get_agent_for_user(user_type)

    if agent is None:
        # رد عام محترم
        response_text = (
            "حاليًا النظام مدرَّب على فئة محددة من المستخدمين فقط، "
            "يرجى التأكد من كتابة نوع المستخدم بشكل صح."
        )

        print("\n--- النتيجة ---")
        print("اسم العميل :", client_name)
        print("نوع المستخدم :", user_type)
        print("الرد :", response_text)
        return

    # -------- البحث في قاعدة المعرفة عبر الإيجنت --------
    # ملاحظة: نفترض أن UmrahAgent عنده دالة:
    #   find_best_row(issue_description) -> (best_row, status_msg)
    best_row, status_msg = agent.find_best_row(issue_description)

    print("\n--- النتيجة ---")
    print("اسم العميل :", client_name)
    print("نوع المستخدم :", user_type)

    if best_row is None:
        # ما لقينا حالة مناسبة في الداتا
        print("الحالة :", status_msg)
        print("الرد :", "نحتاج تفاصيل أكثر عن المشكلة أو تسجيلها كحالة جديدة في النظام.")
    else:
        # نفترض أن best_row هي Series من pandas وفيها هذي الأعمدة
        print("الحالة :", status_msg)
        print("التصنيف :", best_row.get("Category", ""))
        print("درجة المطابقة :", best_row.get("MatchScore", ""))
        print("الرد المقترح :")
        print(best_row.get("Response", ""))


# تشغيل الملف مباشرة
if __name__ == "__main__":
    main()
