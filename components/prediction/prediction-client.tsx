"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  type ActivityLevel,
  type BiologicalSex,
  predictWeight
} from "@/lib/prediction/weight";
import { fetchWithSupabaseAuth } from "@/lib/supabase/auth-fetch";
import type { UserProfile, WeightLog } from "@/types/database";

const activityLevels: { value: ActivityLevel; label: string }[] = [
  { value: "sedentary", label: "Sedentary" },
  { value: "light", label: "Light" },
  { value: "moderate", label: "Moderate" },
  { value: "active", label: "Active" },
  { value: "very_active", label: "Very active" }
];

export function PredictionClient() {
  const router = useRouter();
  const [sex, setSex] = useState<BiologicalSex>("female");
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>("moderate");
  const [age, setAge] = useState(24);
  const [heightCm, setHeightCm] = useState(165);
  const [currentWeightKg, setCurrentWeightKg] = useState(68.2);
  const [targetWeightKg, setTargetWeightKg] = useState(64);
  const [avgDailyIntakeCalories, setAvgDailyIntakeCalories] = useState(1950);
  const [avgDailyExerciseCalories, setAvgDailyExerciseCalories] = useState(120);
  const [weightLogStatus, setWeightLogStatus] = useState("Loading latest weight log...");
  const [profileStatus, setProfileStatus] = useState("Loading profile...");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingWeight, setIsSavingWeight] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadProfileAndWeightLog() {
      try {
        const [profileResponse, weightResponse] = await Promise.all([
          fetchWithSupabaseAuth("/api/profile", { cache: "no-store" }),
          fetchWithSupabaseAuth("/api/weight-logs", { cache: "no-store" })
        ]);

        if (profileResponse.status === 401 || weightResponse.status === 401) {
          router.replace("/login?next=/profile");
          throw new Error("로그인이 필요합니다. 프로필을 저장하려면 다시 로그인해 주세요.");
        }

        if (!profileResponse.ok) {
          throw new Error("Could not load profile.");
        }

        if (!weightResponse.ok) {
          throw new Error("Could not load weight logs.");
        }

        const profilePayload = (await profileResponse.json()) as {
          profile?: UserProfile | null;
        };
        const weightPayload = (await weightResponse.json()) as {
          weight_logs?: WeightLog[];
        };
        const profile = profilePayload.profile;
        const latestLog = weightPayload.weight_logs?.[0];

        if (!isMounted) {
          return;
        }

        if (profile) {
          if (profile.age) {
            setAge(Number(profile.age));
          }

          if (profile.gender === "male" || profile.gender === "female") {
            setSex(profile.gender);
          }

          if (profile.height_cm) {
            setHeightCm(Number(profile.height_cm));
          }

          if (profile.target_weight_kg) {
            setTargetWeightKg(Number(profile.target_weight_kg));
          }

          setProfileStatus("Profile loaded.");
        } else {
          setProfileStatus("No profile yet. Enter height and goal weight, then save.");
        }

        if (latestLog) {
          setCurrentWeightKg(Number(latestLog.weight_kg));
          setWeightLogStatus(`Latest saved weight: ${latestLog.logged_date}`);
        } else {
          setWeightLogStatus("No saved weight yet. Save today's weight to start tracking.");
        }
      } catch (error) {
        if (isMounted) {
          const message =
            error instanceof Error
              ? error.message
              : "Could not load profile and weight logs.";
          setProfileStatus(message);
          setWeightLogStatus(message.includes("로그인") ? "" : message);
        }
      }
    }

    loadProfileAndWeightLog();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const prediction = useMemo(
    () => {
      try {
        return predictWeight({
          sex,
          age,
          heightCm,
          currentWeightKg,
          targetWeightKg,
          activityLevel,
          avgDailyIntakeCalories,
          avgDailyExerciseCalories,
          startDate: new Date()
        });
      } catch {
        return null;
      }
    },
    [
      sex,
      age,
      heightCm,
      currentWeightKg,
      targetWeightKg,
      activityLevel,
      avgDailyIntakeCalories,
      avgDailyExerciseCalories
    ]
  );

  const chartData = [
    { day: "Today", weight: currentWeightKg },
    ...(prediction?.points ?? [])
      .filter((point) => point.day % 5 === 0 || point.day === 1 || point.day === 30)
      .map((point) => ({
        day: `${point.day}d`,
        weight: point.predictedWeightKg
      }))
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Profile & weight goal</h1>
        <p className="mt-2 text-muted-foreground">
          Enter height, current weight, and goal weight to personalize the forecast.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <PredictionCard label="BMR" value={prediction ? `${prediction.bmr} kcal` : "-"} />
        <PredictionCard label="TDEE" value={prediction ? `${prediction.tdee} kcal` : "-"} />
        <PredictionCard
          label="7 days"
          value={prediction ? `${prediction.sevenDay.predictedWeightKg} kg` : "-"}
        />
        <PredictionCard
          label="30 days"
          value={prediction ? `${prediction.thirtyDay.predictedWeightKg} kg` : "-"}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Body profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSaveProfileAndWeight}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <label className="space-y-2 text-sm">
                <span className="font-medium">Sex</span>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2"
                  value={sex}
                  onChange={(event) => setSex(event.target.value as BiologicalSex)}
                >
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                </select>
              </label>
              <NumberField label="Age" value={age} onChange={setAge} />
              <NumberField label="Height cm / 키" value={heightCm} onChange={setHeightCm} />
              <NumberField
                label="Current kg / 현재 체중"
                value={currentWeightKg}
                step={0.1}
                onChange={setCurrentWeightKg}
              />
              <NumberField
                label="Target kg / 목표 체중"
                value={targetWeightKg}
                step={0.1}
                onChange={setTargetWeightKg}
              />
              <NumberField
                label="Daily intake kcal"
                value={avgDailyIntakeCalories}
                onChange={setAvgDailyIntakeCalories}
              />
              <NumberField
                label="Exercise kcal"
                value={avgDailyExerciseCalories}
                onChange={setAvgDailyExerciseCalories}
              />
              <label className="space-y-2 text-sm">
                <span className="font-medium">Activity</span>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2"
                  value={activityLevel}
                  onChange={(event) =>
                    setActivityLevel(event.target.value as ActivityLevel)
                  }
                >
                  {activityLevels.map((level) => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="space-y-2">
              <Button
                className="w-full"
                type="submit"
                disabled={
                  isSavingProfile ||
                  isSavingWeight ||
                  currentWeightKg <= 0 ||
                  heightCm <= 0 ||
                  targetWeightKg <= 0
                }
              >
                {isSavingProfile || isSavingWeight
                  ? "Saving..."
                  : "Save profile & current weight"}
              </Button>
              <p className="text-xs leading-5 text-muted-foreground">
                {profileStatus}
              </p>
              {weightLogStatus ? (
                <p className="text-xs leading-5 text-muted-foreground">
                  {weightLogStatus}
                </p>
              ) : null}
            </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>30 day forecast</CardTitle>
            <p className="text-sm text-muted-foreground">
              {prediction
                ? `Daily balance ${prediction.dailyEnergyBalance} kcal, ${prediction.dailyWeightChangeKg} kg/day`
                : "Enter valid height, weight, and calorie values to preview the forecast."}
              {" "}
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              {prediction ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ left: 16, right: 24, top: 12, bottom: 8 }}>
                    <XAxis dataKey="day" tickLine={false} axisLine={false} />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      domain={["dataMin - 1", "dataMax + 1"]}
                      width={52}
                    />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="weight"
                      stroke="#FF7E67"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      name="Predicted kg"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center rounded-3xl border border-[#F0EDE9] bg-[#FAF8F5] px-4 text-center text-sm leading-6 text-muted-foreground">
                  키, 현재 체중, 목표 체중, 칼로리를 입력하면 예측 그래프가 표시됩니다.
                </div>
              )}
            </div>
            <div className="mt-4 rounded-md border bg-muted/30 p-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Target arrival</span>
                <span className="font-medium">
                  {prediction?.targetReachDate
                    ? `${prediction.targetReachDate} (${prediction.targetReachDays} days)`
                    : "Not reachable with current balance"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );

  async function handleSaveProfileAndWeight(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingProfile(true);
    setIsSavingWeight(true);
    setProfileStatus("Saving profile and goal...");
    setWeightLogStatus("Saving today's weight...");

    try {
      const profileResponse = await fetchWithSupabaseAuth("/api/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          age,
          gender: sex,
          height_cm: heightCm,
          target_weight_kg: targetWeightKg
        })
      });
      const weightResponse = await fetchWithSupabaseAuth("/api/weight-logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          weight_kg: currentWeightKg,
          logged_date: new Date().toISOString().slice(0, 10)
        })
      });

      if (profileResponse.status === 401 || weightResponse.status === 401) {
        router.replace("/login?next=/profile");
        throw new Error("로그인이 필요합니다. 프로필을 저장하려면 다시 로그인해 주세요.");
      }

      if (!profileResponse.ok) {
        throw new Error("Failed to save profile.");
      }

      if (!weightResponse.ok) {
        throw new Error("Failed to save weight.");
      }

      const payload = (await weightResponse.json()) as { weight_log?: WeightLog };
      setProfileStatus(
        `Saved ${heightCm.toFixed(1)}cm height and ${targetWeightKg.toFixed(1)}kg goal.`
      );
      setWeightLogStatus(
        payload.weight_log
          ? `Saved ${Number(payload.weight_log.weight_kg).toFixed(1)}kg for ${payload.weight_log.logged_date}.`
          : "Weight saved."
      );
    } catch (error) {
      setProfileStatus(
        error instanceof Error ? error.message : "Failed to save profile."
      );
      setWeightLogStatus(
        error instanceof Error && error.message.includes("로그인")
          ? ""
          : error instanceof Error
            ? error.message
            : "Failed to save weight."
      );
    } finally {
      setIsSavingProfile(false);
      setIsSavingWeight(false);
    }
  }
}

function NumberField({
  label,
  value,
  step = 1,
  onChange
}: {
  label: string;
  value: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="space-y-2 text-sm">
      <span className="font-medium">{label}</span>
      <Input
        type="number"
        step={step}
        min="0"
        inputMode="decimal"
        value={value > 0 ? value : ""}
        placeholder="입력"
        onFocus={(event) => event.currentTarget.select()}
        onChange={(event) =>
          onChange(event.target.value === "" ? 0 : Number(event.target.value))
        }
      />
    </label>
  );
}

function PredictionCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}
