import { useState } from "react";
import { Sparkles, Check } from "lucide-react";
import { PlanCard } from "./PlanCard";

interface SubscriptionPlansProps {
  plans: any[];
  activeSubscription: any;
  onSubscribe: (plan: any) => void;
}

export function SubscriptionPlans({
  plans,
  activeSubscription,
  onSubscribe,
}: SubscriptionPlansProps) {
  const [hoveredPlan, setHoveredPlan] = useState<number | null>(null);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
      <div className="text-center mb-20">
        <div className="flex items-center justify-center mb-4">
          <Sparkles className="h-8 w-8 text-yellow-400 mr-2" />
          <h1 className="text-4xl font-bold">选择您的完美套餐</h1>
        </div>
        <p className="text-slate-400 text-lg mt-4 max-w-2xl mx-auto">
          解锁高级功能，通过我们灵活的订阅计划将您的体验提升到新的水平。
        </p>
        {activeSubscription && (
          <div className="mt-8 inline-block px-6 py-2 bg-green-600 rounded-full">
            <span className="text-white font-medium flex items-center">
              <Check className="h-5 w-5 mr-2" />
              您当前已订阅 {activeSubscription.plan_name} 计划
            </span>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {plans.map((plan, index) => (
          <PlanCard
            key={plan.name}
            plan={plan}
            isHovered={hoveredPlan === index}
            onMouseEnter={() => setHoveredPlan(index)}
            onMouseLeave={() => setHoveredPlan(null)}
            onSubscribe={() => onSubscribe(plan)}
            isActive={!!activeSubscription}
          />
        ))}
      </div>
    </div>
  );
} 