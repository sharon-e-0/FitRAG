import { describe, expect, it } from "vitest";
import {
  WeightPredictionService,
  calculateBmr,
  calculateTdee,
  predictWeight
} from "@/lib/prediction/weight";

const baseInput = {
  sex: "male" as const,
  age: 30,
  heightCm: 175,
  currentWeightKg: 80,
  targetWeightKg: 78,
  activityLevel: "sedentary" as const,
  avgDailyIntakeCalories: 1800,
  avgDailyExerciseCalories: 0,
  startDate: new Date("2026-06-04T00:00:00.000Z")
};

describe("WeightPredictionService", () => {
  it("calculates BMR with Mifflin-St Jeor formula", () => {
    expect(calculateBmr(baseInput)).toBeCloseTo(1748.75, 2);
  });

  it("calculates TDEE from BMR, activity factor, and exercise calories", () => {
    const tdee = calculateTdee({
      bmr: 1748.75,
      activityLevel: "sedentary",
      avgDailyExerciseCalories: 100
    });

    expect(tdee).toBeCloseTo(2198.5, 2);
  });

  it("returns 7 day and 30 day predictions from energy balance", () => {
    const result = new WeightPredictionService().predict(baseInput);

    expect(result.bmr).toBe(1749);
    expect(result.tdee).toBe(2099);
    expect(result.dailyEnergyBalance).toBe(-299);
    expect(result.sevenDay.day).toBe(7);
    expect(result.sevenDay.date).toBe("2026-06-11");
    expect(result.sevenDay.predictedWeightKg).toBe(79.73);
    expect(result.thirtyDay.day).toBe(30);
    expect(result.thirtyDay.date).toBe("2026-07-04");
    expect(result.thirtyDay.predictedWeightKg).toBe(78.84);
  });

  it("calculates target weight reach date when trend moves toward target", () => {
    const result = predictWeight(baseInput);

    expect(result.targetReachDays).toBe(52);
    expect(result.targetReachDate).toBe("2026-07-26");
  });

  it("returns null target reach date when energy balance moves away from target", () => {
    const result = predictWeight({
      ...baseInput,
      targetWeightKg: 78,
      avgDailyIntakeCalories: 2600
    });

    expect(result.dailyEnergyBalance).toBe(502);
    expect(result.targetReachDays).toBeNull();
    expect(result.targetReachDate).toBeNull();
  });

  it("validates impossible inputs", () => {
    expect(() =>
      predictWeight({
        ...baseInput,
        currentWeightKg: 0
      })
    ).toThrow("currentWeightKg");
  });
});
