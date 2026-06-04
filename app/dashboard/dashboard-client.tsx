"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  Bot,
  Database,
  Flame,
  HeartPulse,
  MessageCircle,
  Moon,
  Send,
  Utensils,
  Weight
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { fetchWithSupabaseAuth } from "@/lib/supabase/auth-fetch";
import { cn } from "@/lib/utils";
import type { FoodRecord } from "@/types/database";

type DashboardMeal = {
  id: string;
  type: string;
  name: string;
  calories: number | null;
  carbs: number;
  protein: number;
  fat: number;
  sugar: number;
  imageUrl: string | null;
  eatenAt: string;
  time: string;
  tags: string[];
};

type RagStatus = {
  total_documents: number;
  embedded_documents: number;
  missing_embeddings: number;
  embedding_rate: number;
  recent_50: {
    total_documents: number;
    embedded_documents: number;
    missing_embeddings: number;
  };
  recent_failures: {
    id: string;
    food_record_id: string | null;
    reason: string;
    error_message: string | null;
    created_at: string;
  }[];
};

const fallbackMeals: DashboardMeal[] = [
  {
    id: "sample-breakfast",
    type: "Breakfast",
    name: "Greek yogurt, berries, oats",
    calories: 420,
    carbs: 54,
    protein: 28,
    fat: 9,
    sugar: 18,
    imageUrl: null,
    eatenAt: new Date().toISOString(),
    time: "08:10",
    tags: ["calm", "home"]
  },
  {
    id: "sample-lunch",
    type: "Lunch",
    name: "Chicken bibimbap",
    calories: 680,
    carbs: 86,
    protein: 38,
    fat: 19,
    sugar: 10,
    imageUrl: null,
    eatenAt: new Date().toISOString(),
    time: "12:35",
    tags: ["focused", "campus"]
  },
  {
    id: "sample-snack",
    type: "Snack",
    name: "Iced latte, protein bar",
    calories: 310,
    carbs: 35,
    protein: 22,
    fat: 8,
    sugar: 20,
    imageUrl: null,
    eatenAt: new Date().toISOString(),
    time: "16:20",
    tags: ["tired", "study"]
  },
  {
    id: "sample-dinner",
    type: "Dinner",
    name: "Salmon, rice, salad",
    calories: 540,
    carbs: 39,
    protein: 42,
    fat: 21,
    sugar: 5,
    imageUrl: null,
    eatenAt: new Date().toISOString(),
    time: "19:05",
    tags: ["relaxed", "home"]
  }
];

const fallbackCalorieData = [
  { day: "Mon", intake: 2050, burn: 2280 },
  { day: "Tue", intake: 1880, burn: 2210 },
  { day: "Wed", intake: 2130, burn: 2300 },
  { day: "Thu", intake: 1950, burn: 2240 },
  { day: "Fri", intake: 2320, burn: 2180 },
  { day: "Sat", intake: 2010, burn: 2360 },
  { day: "Sun", intake: 1860, burn: 2290 }
];

const fallbackNutrientData = [
  { name: "Carbs", value: 214, target: 250, color: "#0f766e" },
  { name: "Protein", value: 102, target: 120, color: "#0284c7" },
  { name: "Fat", value: 58, target: 70, color: "#f59e0b" },
  { name: "Sugar", value: 42, target: 50, color: "#e11d48" }
];

const weightPredictionData = [
  { day: "Today", actual: 68.2, predicted: 68.2 },
  { day: "7d", predicted: 67.9 },
  { day: "14d", predicted: 67.5 },
  { day: "21d", predicted: 67.1 },
  { day: "30d", predicted: 66.8 }
];

const emotionData = [
  { emotion: "Calm", meals: 3, color: "#0f766e" },
  { emotion: "Focused", meals: 2, color: "#0284c7" },
  { emotion: "Tired", meals: 2, color: "#f59e0b" },
  { emotion: "Stressed", meals: 1, color: "#e11d48" }
];

const coachMessages = [
  {
    role: "assistant",
    content:
      "오늘은 단백질 흐름이 안정적이고, 오후 피로 시점에 당 섭취가 몰렸습니다."
  },
  {
    role: "user",
    content: "야식 욕구를 줄이려면 오늘 뭘 바꾸면 좋을까?"
  },
  {
    role: "assistant",
    content:
      "저녁에 단백질은 유지하되 수면 2시간 전 따뜻한 무가당 음료를 추가해 보세요."
  }
];

const summaryCards = [
  {
    label: "Calories",
    value: "1,950",
    unit: "kcal",
    helper: "340 kcal under TDEE",
    icon: Flame,
    tone: "text-primary"
  },
  {
    label: "Protein",
    value: "102",
    unit: "g",
    helper: "85% of daily target",
    icon: Utensils,
    tone: "text-sky-700"
  },
  {
    label: "Activity",
    value: "7,240",
    unit: "steps",
    helper: "58 active minutes",
    icon: Activity,
    tone: "text-amber-600"
  },
  {
    label: "Recovery",
    value: "7.1",
    unit: "h",
    helper: "Sleep trend improving",
    icon: Moon,
    tone: "text-rose-700"
  }
];

export function DashboardClient() {
  const [savedMeals, setSavedMeals] = useState<DashboardMeal[]>([]);
  const [mealStatus, setMealStatus] = useState("Loading saved meals...");
  const [ragStatus, setRagStatus] = useState<RagStatus | null>(null);
  const [ragStatusMessage, setRagStatusMessage] = useState("Loading RAG status...");
  const [isRefreshingRagStatus, setIsRefreshingRagStatus] = useState(false);

  const loadRagStatus = useCallback(async () => {
    setIsRefreshingRagStatus(true);
    setRagStatusMessage("Refreshing RAG status...");

    try {
      const response = await fetchWithSupabaseAuth("/api/rag/status", {
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error("Could not load RAG status.");
      }

      const payload = (await response.json()) as RagStatus;
      setRagStatus(payload);
      setRagStatusMessage(
        `RAG embedding diagnostics updated at ${new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit"
        })}`
      );
    } catch (error) {
      setRagStatusMessage(
        error instanceof Error ? error.message : "Could not load RAG status."
      );
    } finally {
      setIsRefreshingRagStatus(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadMeals() {
      try {
        const response = await fetchWithSupabaseAuth("/api/meals", {
          cache: "no-store"
        });

        if (response.status === 401) {
          throw new Error("Your session has expired. Please log in again.");
        }

        if (!response.ok) {
          throw new Error("Could not load saved meals.");
        }

        const payload = (await response.json()) as { meals?: FoodRecord[] };
        const mappedMeals = (payload.meals ?? []).slice(0, 8).map(mapFoodRecordToMeal);

        if (isMounted) {
          setSavedMeals(mappedMeals);
          setMealStatus(
            mappedMeals.length > 0
              ? "Showing your saved meal records"
              : "No saved meals yet, showing sample dashboard data"
          );
        }
      } catch (error) {
        if (isMounted) {
          setMealStatus(
            error instanceof Error
              ? `${error.message} Showing sample dashboard data.`
              : "Unable to load saved meals, showing sample dashboard data"
          );
        }
      }
    }

    loadMeals();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    loadRagStatus();
  }, [loadRagStatus]);

  const todayMeals = useMemo(
    () => (savedMeals.length > 0 ? savedMeals : fallbackMeals),
    [savedMeals]
  );
  const calorieChartData = useMemo(
    () =>
      savedMeals.length > 0
        ? buildRecentSevenDayCalorieData(savedMeals)
        : fallbackCalorieData,
    [savedMeals]
  );
  const nutrientChartData = useMemo(
    () =>
      savedMeals.length > 0
        ? buildRecentSevenDayNutrientData(savedMeals)
        : fallbackNutrientData,
    [savedMeals]
  );
  const totalCalories = todayMeals.reduce(
    (sum, meal) => sum + (meal.calories ?? 0),
    0
  );

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">FitRAG Dashboard</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal">Daily health cockpit</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Meals, nutrition, emotion signals, Health Connect activity, weight
            prediction, and RAG coaching in one view.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm">
          <HeartPulse className="h-4 w-4 text-primary" />
          <span className="font-medium">Readiness 82</span>
          <span className="text-muted-foreground">stable</span>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((item) => (
          <Card key={item.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {item.label}
              </CardTitle>
              <item.icon className={cn("h-4 w-4", item.tone)} />
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold">{item.value}</span>
                <span className="text-sm text-muted-foreground">{item.unit}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{item.helper}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>RAG admin status</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Embedding generation health from rag_documents
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={loadRagStatus}
            disabled={isRefreshingRagStatus}
          >
            <Database className="h-4 w-4" />
            {isRefreshingRagStatus ? "Refreshing" : "Refresh"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <RagMetric
              label="Total documents"
              value={ragStatus?.total_documents ?? "-"}
            />
            <RagMetric
              label="Embedded"
              value={ragStatus?.embedded_documents ?? "-"}
            />
            <RagMetric
              label="Missing"
              value={ragStatus?.missing_embeddings ?? "-"}
            />
            <RagMetric
              label="Embedding rate"
              value={ragStatus ? `${ragStatus.embedding_rate}%` : "-"}
            />
          </div>
          <div className="grid gap-3 lg:grid-cols-[0.7fr_1.3fr]">
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <p className="font-medium">Recent 50 documents</p>
              <div className="mt-2 space-y-1 text-muted-foreground">
                <p>Total: {ragStatus?.recent_50.total_documents ?? "-"}</p>
                <p>Embedding exists: {ragStatus?.recent_50.embedded_documents ?? "-"}</p>
                <p>Embedding missing: {ragStatus?.recent_50.missing_embeddings ?? "-"}</p>
              </div>
            </div>
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <p className="font-medium">Recent embedding failures</p>
              {ragStatus?.recent_failures.length ? (
                <div className="mt-2 space-y-2">
                  {ragStatus.recent_failures.map((failure) => (
                    <div key={failure.id} className="rounded-md border bg-background p-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">{failure.reason}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(failure.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="mt-1 text-muted-foreground">
                        {failure.error_message ?? "No error message"}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-muted-foreground">No recent failures logged.</p>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{ragStatusMessage}</p>
        </CardContent>
      </Card>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Today&apos;s meals</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {savedMeals.length > 0
                  ? `${todayMeals.length} saved meals, ${totalCalories.toLocaleString()} analyzed kcal`
                  : `${totalCalories.toLocaleString()} kcal logged across ${todayMeals.length} sample meals`}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{mealStatus}</p>
            </div>
            <Utensils className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent className="space-y-3">
            {todayMeals.map((meal) => (
              <div
                key={meal.id}
                className="grid gap-3 rounded-md border p-3 sm:grid-cols-[88px_64px_1fr_auto] sm:items-center"
              >
                <div className="text-sm font-medium">{meal.time}</div>
                <div className="relative h-16 w-16 overflow-hidden rounded-md border bg-muted">
                  {meal.imageUrl ? (
                    <Image
                      src={meal.imageUrl}
                      alt={meal.name}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                      No img
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{meal.name}</span>
                    <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                      {meal.type}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {meal.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md border px-2 py-1 text-xs text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-sm font-semibold sm:text-right">
                  {meal.calories === null ? "Pending analysis" : `${meal.calories} kcal`}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Calorie summary</CardTitle>
            <p className="text-sm text-muted-foreground">Intake compared with TDEE</p>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={calorieChartData} margin={{ left: -18, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d6d3d1" />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="burn"
                    stroke="#0284c7"
                    fill="#bae6fd"
                    name="TDEE"
                  />
                  <Area
                    type="monotone"
                    dataKey="intake"
                    stroke="#0f766e"
                    fill="#ccfbf1"
                    name="Intake"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Nutrient chart</CardTitle>
            <p className="text-sm text-muted-foreground">Current grams against target</p>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={nutrientChartData} margin={{ left: -18, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d6d3d1" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Bar dataKey="target" fill="#e7e5e4" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {nutrientChartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Weight prediction</CardTitle>
            <p className="text-sm text-muted-foreground">Rule-based 30 day forecast</p>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weightPredictionData} margin={{ left: -18, right: 16, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d6d3d1" />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} />
                  <YAxis domain={[66, 69]} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="predicted"
                    stroke="#0f766e"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    name="Predicted kg"
                  />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="#0284c7"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    name="Actual kg"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <span className="text-muted-foreground">Goal arrival</span>
              <span className="font-medium">Jul 26, 2026</span>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 xl:col-span-1">
          <CardHeader>
            <CardTitle>Emotion report</CardTitle>
            <p className="text-sm text-muted-foreground">Meal-linked emotional signals</p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-[0.9fr_1fr] xl:grid-cols-1">
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={emotionData}
                      dataKey="meals"
                      nameKey="emotion"
                      innerRadius={48}
                      outerRadius={78}
                      paddingAngle={4}
                    >
                      {emotionData.map((entry) => (
                        <Cell key={entry.emotion} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
                {emotionData.map((item) => (
                  <div key={item.emotion} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-sm"
                        style={{ backgroundColor: item.color }}
                      />
                      <span>{item.emotion}</span>
                    </div>
                    <span className="font-medium">{item.meals} meals</span>
                  </div>
                ))}
                <div className="rounded-md border bg-muted/40 p-3 text-sm leading-6 text-muted-foreground">
                  Afternoon fatigue appears before higher sugar intake. Protein-rich
                  snacks are likely to reduce late cravings.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <CardHeader>
            <CardTitle>Health signals</CardTitle>
            <p className="text-sm text-muted-foreground">Patterns detected from today</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <SignalRow label="Energy balance" value="-340 kcal" trend="on track" />
            <SignalRow label="Protein target" value="85%" trend="needs dinner support" />
            <SignalRow label="Stress eating risk" value="medium" trend="peaks after 16:00" />
            <SignalRow label="Sodium load" value="1,980 mg" trend="watch dinner sauces" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>AI coach chat</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                RAG answer grounded in your personal records
              </p>
            </div>
            <Bot className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-h-80 space-y-3 overflow-y-auto rounded-md border bg-muted/30 p-3">
              {coachMessages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={cn(
                    "max-w-[88%] rounded-md px-3 py-2 text-sm leading-6",
                    message.role === "user"
                      ? "ml-auto bg-primary text-primary-foreground"
                      : "bg-card"
                  )}
                >
                  {message.content}
                </div>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <Textarea
                className="min-h-20"
                placeholder="Ask about meals, emotion, activity, or weight prediction."
              />
              <Button className="h-20 gap-2 sm:w-28">
                <Send className="h-4 w-4" />
                Send
              </Button>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MessageCircle className="h-4 w-4" />
              <span>Top 8 records retrieved from pgvector</span>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function RagMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border px-3 py-3">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function mapFoodRecordToMeal(record: FoodRecord): DashboardMeal {
  const eatenAt = new Date(record.eaten_at);
  const time = Number.isNaN(eatenAt.getTime())
    ? "--:--"
    : eatenAt.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      });
  const analysisResults = record.food_analysis_results ?? [];
  const calories = analysisResults.reduce(
    (sum, result) => sum + Number(result.calories ?? 0),
    0
  );
  const carbs = analysisResults.reduce(
    (sum, result) => sum + Number(result.carbohydrate_g ?? 0),
    0
  );
  const protein = analysisResults.reduce(
    (sum, result) => sum + Number(result.protein_g ?? 0),
    0
  );
  const fat = analysisResults.reduce(
    (sum, result) => sum + Number(result.fat_g ?? 0),
    0
  );
  const sugar = analysisResults.reduce(
    (sum, result) => sum + Number(result.sugar_g ?? 0),
    0
  );
  const foodNames = analysisResults
    .map((result) => result.food_name)
    .filter(Boolean)
    .join(", ");

  return {
    id: record.id,
    type: formatMealType(record.meal_type),
    name: foodNames || record.raw_text || record.memo || "Saved meal",
    calories: calories > 0 ? Math.round(calories) : null,
    carbs,
    protein,
    fat,
    sugar,
    imageUrl: record.image_url,
    eatenAt: record.eaten_at,
    time,
    tags: [
      record.input_type,
      record.emotion ?? "normal",
      record.context ?? "normal_meal",
      "saved"
    ]
  };
}

function buildRecentSevenDayCalorieData(meals: DashboardMeal[]) {
  return getRecentSevenDays().map((day) => {
    const intake = meals
      .filter((meal) => meal.eatenAt.slice(0, 10) === day.dateKey)
      .reduce((sum, meal) => sum + (meal.calories ?? 0), 0);

    return {
      day: day.label,
      intake: Math.round(intake),
      burn: 2200
    };
  });
}

function buildRecentSevenDayNutrientData(meals: DashboardMeal[]) {
  const recentDateKeys = new Set(getRecentSevenDays().map((day) => day.dateKey));
  const recentMeals = meals.filter((meal) => recentDateKeys.has(meal.eatenAt.slice(0, 10)));
  const totals = recentMeals.reduce(
    (sum, meal) => ({
      carbs: sum.carbs + meal.carbs,
      protein: sum.protein + meal.protein,
      fat: sum.fat + meal.fat,
      sugar: sum.sugar + meal.sugar
    }),
    { carbs: 0, protein: 0, fat: 0, sugar: 0 }
  );

  return [
    { name: "Carbs", value: Math.round(totals.carbs), target: 250, color: "#0f766e" },
    { name: "Protein", value: Math.round(totals.protein), target: 120, color: "#0284c7" },
    { name: "Fat", value: Math.round(totals.fat), target: 70, color: "#f59e0b" },
    { name: "Sugar", value: Math.round(totals.sugar), target: 50, color: "#e11d48" }
  ];
}

function getRecentSevenDays() {
  const formatter = new Intl.DateTimeFormat("en", { weekday: "short" });

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));

    return {
      dateKey: date.toISOString().slice(0, 10),
      label: formatter.format(date)
    };
  });
}

function formatMealType(mealType: FoodRecord["meal_type"]) {
  if (!mealType) {
    return "Meal";
  }

  return mealType
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function SignalRow({
  label,
  value,
  trend
}: {
  label: string;
  value: string;
  trend: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-1 truncate text-sm text-muted-foreground">{trend}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1 font-semibold">
        {value}
        <ArrowUpRight className="h-4 w-4 text-primary" />
      </div>
    </div>
  );
}
