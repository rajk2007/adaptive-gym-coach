import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

type Step = 1 | 2 | 3 | 4 | 5;

interface FormData {
  age: number | "";
  gender: "" | "male" | "female" | "other";
  height: number | "";
  weight: number | "";
  goal: "" | "muscle_gain" | "fat_loss" | "strength" | "recomposition";
  experienceLevel: "" | "beginner" | "intermediate" | "advanced";
  daysPerWeek: number | "";
  equipmentAccess: string[];
}

const EQUIPMENT_OPTIONS = [
  "Barbell",
  "Dumbbell",
  "Machines",
  "Cable",
  "Cardio",
  "Bodyweight",
  "Resistance Bands",
];

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [formData, setFormData] = useState<FormData>({
    age: "",
    gender: "",
    height: "",
    weight: "",
    goal: "",
    experienceLevel: "",
    daysPerWeek: "",
    equipmentAccess: [],
  });

  const updateProfileMutation = trpc.fitness.updateProfile.useMutation();
  const generatePlanMutation = trpc.fitness.generateInitialPlan.useMutation();

  const handleNext = () => {
    if (currentStep === 1) {
      if (!formData.age || !formData.gender || !formData.height || !formData.weight) {
        toast.error("Please fill in all body info fields");
        return;
      }
    }
    if (currentStep === 2 && !formData.goal) {
      toast.error("Please select a fitness goal");
      return;
    }
    if (currentStep === 3 && !formData.experienceLevel) {
      toast.error("Please select your experience level");
      return;
    }
    if (currentStep === 4 && (!formData.daysPerWeek || formData.equipmentAccess.length === 0)) {
      toast.error("Please select days per week and equipment access");
      return;
    }

    if (currentStep < 5) {
      setCurrentStep((currentStep + 1) as Step);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as Step);
    }
  };

  const handleSubmit = async () => {
    try {
      // Update profile
      await updateProfileMutation.mutateAsync({
        age: Number(formData.age),
        gender: formData.gender as "male" | "female" | "other",
        height: Number(formData.height),
        weight: Number(formData.weight),
        goal: formData.goal as "muscle_gain" | "fat_loss" | "strength" | "recomposition",
        experienceLevel: formData.experienceLevel as "beginner" | "intermediate" | "advanced",
        daysPerWeek: Number(formData.daysPerWeek),
        equipmentAccess: formData.equipmentAccess,
      });

      // Generate initial plan
      await generatePlanMutation.mutateAsync();

      toast.success("Profile created and workout plan generated!");
      setLocation("/dashboard");
    } catch (error) {
      toast.error("Failed to complete onboarding");
      console.error(error);
    }
  };

  const progress = (currentStep / 5) * 100;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Welcome to Adaptive Gym Coach</h1>
          <p className="text-muted-foreground">Let's set up your personalized fitness plan</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Step {currentStep} of 5</span>
            <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Form Card */}
        <Card className="p-8 mb-8">
          {/* Step 1: Body Info */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-fadeInUp">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">Body Information</h2>
                <p className="text-muted-foreground mb-6">Help us understand your current fitness profile</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Age</label>
                  <input
                    type="number"
                    min="13"
                    max="120"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value ? Number(e.target.value) : "" })}
                    className="w-full px-4 py-2 border border-border rounded-lg bg-input text-foreground"
                    placeholder="25"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                    className="w-full px-4 py-2 border border-border rounded-lg bg-input text-foreground"
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Height (cm)</label>
                  <input
                    type="number"
                    min="100"
                    max="250"
                    value={formData.height}
                    onChange={(e) => setFormData({ ...formData, height: e.target.value ? Number(e.target.value) : "" })}
                    className="w-full px-4 py-2 border border-border rounded-lg bg-input text-foreground"
                    placeholder="180"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Weight (kg)</label>
                  <input
                    type="number"
                    min="30"
                    max="300"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value ? Number(e.target.value) : "" })}
                    className="w-full px-4 py-2 border border-border rounded-lg bg-input text-foreground"
                    placeholder="75"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Goal Selection */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-fadeInUp">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">Fitness Goal</h2>
                <p className="text-muted-foreground mb-6">What's your primary fitness goal?</p>
              </div>

              <div className="space-y-3">
                {[
                  { value: "muscle_gain", label: "Muscle Gain", desc: "Build lean muscle mass" },
                  { value: "fat_loss", label: "Fat Loss", desc: "Reduce body fat percentage" },
                  { value: "strength", label: "Strength", desc: "Increase lifting power" },
                  { value: "recomposition", label: "Body Recomposition", desc: "Build muscle while losing fat" },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setFormData({ ...formData, goal: option.value as any })}
                    className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                      formData.goal === option.value
                        ? "border-accent bg-accent/10"
                        : "border-border bg-card hover:border-accent/50"
                    }`}
                  >
                    <div className="font-semibold text-foreground">{option.label}</div>
                    <div className="text-sm text-muted-foreground">{option.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Experience Level */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-fadeInUp">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">Experience Level</h2>
                <p className="text-muted-foreground mb-6">How long have you been training?</p>
              </div>

              <div className="space-y-3">
                {[
                  { value: "beginner", label: "Beginner", desc: "Less than 1 year of training" },
                  { value: "intermediate", label: "Intermediate", desc: "1-3 years of consistent training" },
                  { value: "advanced", label: "Advanced", desc: "3+ years of serious training" },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setFormData({ ...formData, experienceLevel: option.value as any })}
                    className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                      formData.experienceLevel === option.value
                        ? "border-accent bg-accent/10"
                        : "border-border bg-card hover:border-accent/50"
                    }`}
                  >
                    <div className="font-semibold text-foreground">{option.label}</div>
                    <div className="text-sm text-muted-foreground">{option.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Schedule & Equipment */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-fadeInUp">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">Training Schedule & Equipment</h2>
                <p className="text-muted-foreground mb-6">How many days per week can you train?</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-3">Days Per Week</label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                    <button
                      key={day}
                      onClick={() => setFormData({ ...formData, daysPerWeek: day })}
                      className={`p-3 rounded-lg border-2 font-semibold transition-all ${
                        formData.daysPerWeek === day
                          ? "border-accent bg-accent text-accent-foreground"
                          : "border-border bg-card hover:border-accent/50"
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-3">Available Equipment</label>
                <div className="grid grid-cols-2 gap-2">
                  {EQUIPMENT_OPTIONS.map((equipment) => (
                    <button
                      key={equipment}
                      onClick={() => {
                        const updated = formData.equipmentAccess.includes(equipment)
                          ? formData.equipmentAccess.filter((e) => e !== equipment)
                          : [...formData.equipmentAccess, equipment];
                        setFormData({ ...formData, equipmentAccess: updated });
                      }}
                      className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                        formData.equipmentAccess.includes(equipment)
                          ? "border-accent bg-accent text-accent-foreground"
                          : "border-border bg-card hover:border-accent/50"
                      }`}
                    >
                      {equipment}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Review & Generate */}
          {currentStep === 5 && (
            <div className="space-y-6 animate-fadeInUp">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">Ready to Generate Your Plan</h2>
                <p className="text-muted-foreground mb-6">Review your information before we generate your personalized workout plan</p>
              </div>

              <div className="bg-card border border-border rounded-lg p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Age</p>
                    <p className="text-lg font-semibold text-foreground">{formData.age} years</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Gender</p>
                    <p className="text-lg font-semibold text-foreground capitalize">{formData.gender}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Height / Weight</p>
                    <p className="text-lg font-semibold text-foreground">{formData.height}cm / {formData.weight}kg</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Goal</p>
                    <p className="text-lg font-semibold text-foreground capitalize">{formData.goal?.replace(/_/g, " ")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Experience</p>
                    <p className="text-lg font-semibold text-foreground capitalize">{formData.experienceLevel}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Training Days</p>
                    <p className="text-lg font-semibold text-foreground">{formData.daysPerWeek} days/week</p>
                  </div>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                Our AI coach will create a personalized workout plan based on your information. You can always adjust it later!
              </p>
            </div>
          )}
        </Card>

        {/* Navigation Buttons */}
        <div className="flex gap-4">
          <Button
            onClick={handleBack}
            variant="outline"
            disabled={currentStep === 1}
            className="flex-1"
          >
            Back
          </Button>
          {currentStep < 5 ? (
            <Button onClick={handleNext} className="flex-1">
              Next
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={generatePlanMutation.isPending}
              className="flex-1"
            >
              {generatePlanMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Plan...
                </>
              ) : (
                "Generate My Plan"
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
