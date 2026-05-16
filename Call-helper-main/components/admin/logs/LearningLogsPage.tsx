import { Brain } from "lucide-react";
import { Card } from "../../ui/card";
import { useLanguage } from "../../../contexts/LanguageContext";

export function LearningLogsPage() {
  const { t } = useLanguage();

  return (
    <>
      <section className="space-y-6">
        <header className="flex items-center gap-3">
          <span className="p-2 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl inline-flex">
            <Brain className="size-6 text-white" />
          </span>
          <span>
            <h2 className="text-2xl font-bold text-foreground">{t("admin.learningLogs.title")}</h2>
            <p className="text-muted-foreground">{t("admin.learningLogs.subtitleAlt")}</p>
          </span>
        </header>

        <Card className="glass-panel border-2 border-border p-6">
          <div className="text-center py-12">
            <Brain className="size-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-bold text-foreground mb-2">{t("admin.learningLogs.pageTitle")}</h3>
            <p className="text-muted-foreground">{t("admin.learningLogs.comingSoon")}</p>
          </div>
        </Card>
      </section>
    </>
  );
}
