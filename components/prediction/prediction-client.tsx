"use client";

import { useMemo, useState } from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  type ActivityLevel,
  type BiologicalSex,
  predictWeight
} from "@/lib/prediction/weight";

const activityLevels: { value: ActivityLevel; label: string }[] = [
  { value: "sedentary", label: "Sedentary" },
  { value: "light", label: "Light" },
  { value: "moderate", label: "Moderate" },
  { value: "active", label: "Active" },
  { value: "very_active", label: "Very active" }
];

export function PredictionClient() {
  const [sex, setSex] = useState<BiologicalSex>("female");
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>("moderate");
  const [age, setAge] = useState(24);
  const [heightCm, setHeightCm] = useState(165);
  const [currentWeightKg, setCurrentWeightKg] = useState(68.2);
  const [targetWeightKg, setTargetWeightKg] = useState(64);
  const [avgDailyIntakeCalories, setAvgDailyIntakeCalories] = useState(1950);
  const [avgDailyExerciseCalories, setAvgDailyExerciseCalories] = useState(120);

  const prediction = useMemo(
    () =>
      predictWeight({
        sex,
        age,
        heightCm,
        currentWeightKg,
        targetWeightKg,
        activityLevel,
        avgDailyIntakeCalories,
        avgDailyExerciseCalories,
        startDate: new Date()
      }),
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
    ...prediction.points
      .filter((point) => point.day % 5 === 0 || point.day === 1 || point.day === 30)
      .map((point) => ({
        day: `${point.day}d`,
        weight: point.predictedWeightKg
      }))
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Weight prediction</h1>
        <p className="mt-2 text-muted-foreground">
          Rule-based forecast using BMR, TDEE, energy balance, and cumulative calories.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <PredictionCard label="BMR" value={`${prediction.bmr} kcal`} />
        <PredictionCard label="TDEE" value={`${prediction.tdee} kcal`} />
        <PredictionCard
          label="7 days"
          value={`${prediction.sevenDay.predictedWeightKg} kg`}
        />
        <PredictionCard
          label="30 days"
          value={`${prediction.thirtyDay.predictedWeightKg} kg`}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Inputs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
              <NumberField label="Height cm" value={heightCm} onChange={setHeightCm} />
              <NumberField
                label="Current kg"
                value={currentWeightKg}
                step={0.1}
                onChange={setCurrentWeightKg}
              />
              <NumberField
                label="Target kg"
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>30 day forecast</CardTitle>
            <p className="text-sm text-muted-foreground">
              Daily balance {prediction.dailyEnergyBalance} kcal,
              {" "}
              {prediction.dailyWeightChangeKg} kg/day
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ left: -18, right: 16, top: 8 }}>
                  <XAxis dataKey="day" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} domain={["dataMin - 1", "dataMax + 1"]} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="weight"
                    stroke="#0f766e"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    name="Predicted kg"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 rounded-md border bg-muted/30 p-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Target arrival</span>
                <span className="font-medium">
                  {prediction.targetReachDate
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
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
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
