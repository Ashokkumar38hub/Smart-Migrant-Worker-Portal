import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2, AlertTriangle, XCircle, TrendingUp,
  BookOpen, Clock, Star, Award
} from "lucide-react";
import { motion } from "framer-motion";

// Sample skill gap data
const sampleAnalysis = {
  overallScore: 72,
  breakdown: {
    skills: 75,
    education: 65,
    experience: 80,
  },
  matchedSkills: [
    { name: "Masonry", level: "advanced" },
    { name: "Concrete Work", level: "intermediate" },
    { name: "Safety Protocols", level: "advanced" },
  ],
  partialSkills: [
    { name: "Welding", level: "beginner", required: "intermediate", progress: 40 },
    { name: "Blueprint Reading", level: "beginner", required: "intermediate", progress: 30 },
  ],
  missingSkills: [
    { name: "Heavy Equipment Operation", mandatory: true },
    { name: "AutoCAD Basics", mandatory: false },
  ],
  recommendations: [
    "Complete a welding certification course to improve match score by 15%",
    "Gain experience with heavy equipment through NSDC training program",
    "Take an AutoCAD basics course for better construction job matches",
  ],
  courses: [
    {
      name: "Certified Welder Course",
      duration: "3 months",
      provider: "NSDC",
      relevance: 95,
      isFree: true,
    },
    {
      name: "Heavy Equipment Operation",
      duration: "2 months",
      provider: "CSTARI",
      relevance: 88,
      isFree: true,
    },
    {
      name: "AutoCAD for Construction",
      duration: "1 month",
      provider: "Skill India",
      relevance: 72,
      isFree: false,
    },
    {
      name: "Advanced Safety Management",
      duration: "2 weeks",
      provider: "TNSCMA",
      relevance: 65,
      isFree: true,
    },
  ],
};

const getScoreColor = (score: number) => {
  if (score >= 80) return "from-green-500 to-emerald-600";
  if (score >= 60) return "from-amber-500 to-yellow-600";
  if (score >= 40) return "from-orange-500 to-amber-600";
  return "from-red-500 to-rose-600";
};

const getScoreBg = (score: number) => {
  if (score >= 80) return "bg-green-500/10 border-green-500/30";
  if (score >= 60) return "bg-amber-500/10 border-amber-500/30";
  if (score >= 40) return "bg-orange-500/10 border-orange-500/30";
  return "bg-red-500/10 border-red-500/30";
};

const SkillGapAnalysis = () => {
  const { t } = useLanguage();
  const data = sampleAnalysis;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Overall Score Header */}
      <div className={`rounded-lg p-6 bg-gradient-to-r ${getScoreColor(data.overallScore)} relative overflow-hidden`}>
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6">
          <div className="text-center">
            <div className="text-6xl font-extrabold text-white">{data.overallScore}%</div>
            <div className="text-white/80 font-medium">{t("overallMatch")}</div>
          </div>
          <div className="flex-1 grid grid-cols-3 gap-4">
            {[
              { label: t("skillsScore"), value: data.breakdown.skills },
              { label: t("educationScore"), value: data.breakdown.education },
              { label: t("experienceScore"), value: data.breakdown.experience },
            ].map((item) => (
              <div key={item.label} className="text-center">
                <div className="text-2xl font-bold text-white">{item.value}%</div>
                <div className="text-xs text-white/70">{item.label}</div>
                <div className="mt-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full transition-all duration-1000"
                    style={{ width: `${item.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Matched Skills */}
      <div>
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2 mb-3">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          {t("matched")}
        </h3>
        <div className="grid gap-2 sm:grid-cols-3">
          {data.matchedSkills.map((skill) => (
            <div key={skill.name} className="rounded-lg border border-green-500/30 bg-green-500/10 p-4">
              <div className="font-medium text-foreground">{skill.name}</div>
              <Badge variant="secondary" className="mt-1 text-xs bg-green-500/20 text-green-400 border-0">
                {t(skill.level)}
              </Badge>
            </div>
          ))}
        </div>
      </div>

      {/* Partial Matches */}
      <div>
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2 mb-3">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          {t("partial")}
        </h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {data.partialSkills.map((skill) => (
            <div key={skill.name} className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
              <div className="font-medium text-foreground">{skill.name}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {t(skill.level)} → {t(skill.required)}
              </div>
              <Progress value={skill.progress} className="mt-2 h-2" />
            </div>
          ))}
        </div>
      </div>

      {/* Missing Skills */}
      <div>
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2 mb-3">
          <XCircle className="h-5 w-5 text-red-500" />
          {t("missing")}
        </h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {data.missingSkills.map((skill) => (
            <div key={skill.name} className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 flex items-center justify-between">
              <span className="font-medium text-foreground">{skill.name}</span>
              {skill.mandatory && (
                <Badge variant="destructive" className="text-xs">
                  {t("mandatory")}
                </Badge>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      <div>
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2 mb-3">
          <TrendingUp className="h-5 w-5 text-primary" />
          {t("recommendations")}
        </h3>
        <div className="space-y-2">
          {data.recommendations.map((rec, i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-4 flex items-start gap-3">
              <Award className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-sm text-foreground">{rec}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recommended Courses */}
      <div>
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2 mb-3">
          <BookOpen className="h-5 w-5 text-secondary" />
          {t("courses")}
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {data.courses.map((course) => (
            <div key={course.name} className="rounded-lg border border-border bg-card p-4 hover:border-primary/30 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-medium text-foreground">{course.name}</h4>
                <Badge variant={course.isFree ? "secondary" : "outline"} className="text-xs flex-shrink-0">
                  {course.isFree ? t("free") : t("paid")}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {course.duration}
                </span>
                <span className="flex items-center gap-1">
                  <BookOpen className="h-3 w-3" /> {course.provider}
                </span>
                <span className="flex items-center gap-1">
                  <Star className="h-3 w-3 text-primary" /> {course.relevance}% {t("relevance")}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default SkillGapAnalysis;
