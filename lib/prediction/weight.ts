export const CALORIES_PER_KG = 7700;

export type BiologicalSex = "male" | "female";

export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";

export type WeightPredictionInput = {
  sex: BiologicalSex;
  age: number;
  heightCm: number;
  currentWeightKg: number;
  targetWeightKg?: number;
  activityLevel: ActivityLevel;
  avgDailyIntakeCalories: number;
  avgDailyExerciseCalories?: number;
  startDate?: Date;
};

export type PredictionPoint = {
  day: number;
  date: string;
  cumulativeCalorieBalance: number;
  predictedWeightKg: number;
};

export type WeightPredictionResult = {
  bmr: number;
  tdee: number;
  dailyEnergyBalance: number;
  dailyWeightChangeKg: number;
  sevenDay: PredictionPoint;
  thirtyDay: PredictionPoint;
  targetReachDate: string | null;
  targetReachDays: number | null;
  points: PredictionPoint[];
};

const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9
};

export class WeightPredictionService {
  predict(input: WeightPredictionInput): WeightPredictionResult {
    validateInput(input);

    const startDate = input.startDate ?? new Date();
    const bmr = calculateBmr(input);
    const tdee = calculateTdee({
      bmr,
      activityLevel: input.activityLevel,
      avgDailyExerciseCalories: input.avgDailyExerciseCalories ?? 0
    });
    const dailyEnergyBalance = input.avgDailyIntakeCalories - tdee;
    const dailyWeightChangeKg = dailyEnergyBalance / CALORIES_PER_KG;
    const points = buildPredictionPoints({
      currentWeightKg: input.currentWeightKg,
      dailyEnergyBalance,
      startDate,
      days: 30
    });
    const target = calculateTargetReach({
      currentWeightKg: input.currentWeightKg,
      targetWeightKg: input.targetWeightKg,
      dailyWeightChangeKg,
      startDate
    });

    return {
      bmr: roundNumber(bmr, 0),
      tdee: roundNumber(tdee, 0),
      dailyEnergyBalance: roundNumber(dailyEnergyBalance, 0),
      dailyWeightChangeKg: roundNumber(dailyWeightChangeKg, 4),
      sevenDay: points[6],
      thirtyDay: points[29],
      targetReachDate: target.date,
      targetReachDays: target.days,
      points
    };
  }
}

export function calculateBmr(input: Pick<WeightPredictionInput, "sex" | "age" | "heightCm" | "currentWeightKg">) {
  const base = 10 * input.currentWeightKg + 6.25 * input.heightCm - 5 * input.age;

  if (input.sex === "male") {
    return base + 5;
  }

  return base - 161;
}

export function calculateTdee(input: {
  bmr: number;
  activityLevel: ActivityLevel;
  avgDailyExerciseCalories?: number;
}) {
  return input.bmr * ACTIVITY_FACTORS[input.activityLevel] + (input.avgDailyExerciseCalories ?? 0);
}

export function predictWeight(input: WeightPredictionInput) {
  return new WeightPredictionService().predict(input);
}

function buildPredictionPoints(input: {
  currentWeightKg: number;
  dailyEnergyBalance: number;
  startDate: Date;
  days: number;
}) {
  return Array.from({ length: input.days }, (_, index) => {
    const day = index + 1;
    const cumulativeCalorieBalance = input.dailyEnergyBalance * day;
    const predictedWeightKg =
      input.currentWeightKg + cumulativeCalorieBalance / CALORIES_PER_KG;

    return {
      day,
      date: addDays(input.startDate, day).toISOString().slice(0, 10),
      cumulativeCalorieBalance: roundNumber(cumulativeCalorieBalance, 0),
      predictedWeightKg: roundNumber(predictedWeightKg, 2)
    };
  });
}

function calculateTargetReach(input: {
  currentWeightKg: number;
  targetWeightKg?: number;
  dailyWeightChangeKg: number;
  startDate: Date;
}) {
  if (!input.targetWeightKg || input.targetWeightKg === input.currentWeightKg) {
    return { date: null, days: null };
  }

  const requiredChangeKg = input.targetWeightKg - input.currentWeightKg;
  const movingTowardTarget =
    Math.sign(requiredChangeKg) === Math.sign(input.dailyWeightChangeKg);

  if (!movingTowardTarget || input.dailyWeightChangeKg === 0) {
    return { date: null, days: null };
  }

  const days = Math.ceil(requiredChangeKg / input.dailyWeightChangeKg);

  if (!Number.isFinite(days) || days < 0) {
    return { date: null, days: null };
  }

  return {
    date: addDays(input.startDate, days).toISOString().slice(0, 10),
    days
  };
}

function validateInput(input: WeightPredictionInput) {
  const checks = [
    ["age", input.age > 0 && input.age < 130],
    ["heightCm", input.heightCm > 0],
    ["currentWeightKg", input.currentWeightKg > 0],
    ["avgDailyIntakeCalories", input.avgDailyIntakeCalories >= 0],
    [
      "avgDailyExerciseCalories",
      input.avgDailyExerciseCalories === undefined || input.avgDailyExerciseCalories >= 0
    ]
  ] as const;

  const failed = checks.find(([, isValid]) => !isValid);

  if (failed) {
    throw new Error(`Invalid weight prediction input: ${failed[0]}`);
  }
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
}

function roundNumber(value: number, digits: number) {
  const factor = 10 ** digits;
  const scaled = value * factor;
  const rounded =
    scaled < 0 ? -Math.round(Math.abs(scaled)) : Math.round(scaled);

  return rounded / factor;
}
