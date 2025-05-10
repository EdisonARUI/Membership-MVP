/**
 * SubscriptionPlans component displays a list of available subscription plans for the user to choose from.
 * It highlights the active subscription and provides UI feedback for plan selection and subscription actions.
 *
 * Features:
 * - Displays all available subscription plans
 * - Highlights the user's current active subscription
 * - Handles plan selection, hover, and subscribe actions
 * - Integrates with parent for subscription management
 */
import { useState } from "react";
import { Sparkles, Check } from "lucide-react";
import { PlanCard } from "./PlanCard";
import { SubscriptionPlan, Subscription } from "@/interfaces/Subscription";

/**
 * Props for SubscriptionPlans component
 */
interface SubscriptionPlansProps {
  /**
   * Array of available subscription plans
   */
  plans: SubscriptionPlan[];
  /**
   * The user's current active subscription
   */
  activeSubscription: Subscription | null;
  /**
   * Whether a loading state is active for subscription actions
   */
  loadingAction: boolean;
  /**
   * Callback to subscribe to a plan
   * @param plan - The selected plan to subscribe to
   */
  onSubscribe: (plan: SubscriptionPlan) => void;
}

/**
 * SubscriptionPlans component for displaying and selecting subscription plans
 *
 * @param {SubscriptionPlansProps} props - Component props
 * @returns {JSX.Element} The rendered subscription plans section
 */
export function SubscriptionPlans({
  plans,
  activeSubscription,
  loadingAction,
  onSubscribe,
}: SubscriptionPlansProps) {
  const [hoveredPlan, setHoveredPlan] = useState<number | null>(null);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
      <div className="text-center mb-20">
        <div className="flex items-center justify-center mb-4">
          <Sparkles className="h-8 w-8 text-yellow-400 mr-2" />
          <h1 className="text-4xl font-bold">Choose Your Perfect Plan</h1>
        </div>
        <p className="text-slate-400 text-lg mt-4 max-w-2xl mx-auto">
          Unlock premium features and elevate your experience with our flexible subscription plans.
        </p>
        {activeSubscription && (
          <div className="mt-8 inline-block px-6 py-2 bg-green-600 rounded-full">
            <span className="text-white font-medium flex items-center">
              <Check className="h-5 w-5 mr-2" />
              You are currently subscribed to the {activeSubscription.plan_name} plan
            </span>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {plans.map((plan, index) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            isHovered={hoveredPlan === index}
            onMouseEnter={() => setHoveredPlan(index)}
            onMouseLeave={() => setHoveredPlan(null)}
            onSubscribe={() => onSubscribe(plan)}
            isActive={!!activeSubscription}
            isLoading={loadingAction}
          />
        ))}
      </div>
    </div>
  );
} 