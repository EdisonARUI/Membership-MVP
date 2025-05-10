/**
 * PlanCard component displays a subscription plan card with features, price, and subscribe action.
 * It highlights the most popular plan and provides UI feedback for hover and loading states.
 *
 * Features:
 * - Displays plan name, price, period, and features
 * - Highlights most popular plan
 * - Handles hover, subscribe, and loading states
 * - Integrates with parent for subscription actions
 */
import { Zap, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SubscriptionPlan } from '@/interfaces/Subscription';

/**
 * Props for PlanCard component
 */
type PlanCardProps = {
  /**
   * Subscription plan data
   */
  plan: SubscriptionPlan;
  /**
   * Whether the card is currently hovered
   */
  isHovered: boolean;
  /**
   * Mouse enter event handler
   */
  onMouseEnter: () => void;
  /**
   * Mouse leave event handler
   */
  onMouseLeave: () => void;
  /**
   * Subscribe button click handler
   */
  onSubscribe: () => void;
  /**
   * Whether this plan is currently active for the user
   */
  isActive: boolean;
  /**
   * Whether a loading state is active (e.g., subscribing)
   */
  isLoading: boolean;
};

/**
 * PlanCard component for displaying a subscription plan and handling subscribe actions
 *
 * @param {PlanCardProps} props - Component props
 * @returns {JSX.Element|null} The rendered plan card or null if filtered out
 */
export function PlanCard({ 
  plan, 
  isHovered, 
  onMouseEnter, 
  onMouseLeave, 
  onSubscribe,
  isActive,
  isLoading
}: PlanCardProps) {
  // Skip rendering test plans
  if (plan.name.toLowerCase().includes('test')) {
    return null;
  }
  
  return (
    <div className="flex flex-col">
      <div
        className={cn(
          "relative rounded-2xl p-8 transition-all duration-300",
          "bg-gradient-to-b from-slate-800 to-slate-900",
          "border border-slate-700 hover:border-slate-500",
          isHovered ? "transform scale-105" : "",
          plan.is_popular ? "ring-2 ring-yellow-400" : ""
        )}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {plan.is_popular && (
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
            <span className="bg-yellow-400 text-black px-3 py-1 rounded-full text-sm font-medium flex items-center">
              <Zap className="h-4 w-4 mr-1" />
              Most Popular
            </span>
          </div>
        )}

        <div className="text-center mb-8">
          <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
          <div className="flex items-center justify-center">
            <span className="text-4xl font-bold">${plan.price}</span>
            <span className="text-slate-400 ml-2">
              {plan.period === 'monthly' ? 'Monthly' : plan.period === 'quarterly' ? 'Quarterly' : 'Yearly'}
            </span>
          </div>
        </div>
        
        <div className="space-y-2">
          {plan.features.map((feature, index) => (
            <div key={index} className="flex items-center text-sm">
              <Check className="h-4 w-4 text-green-400 mr-2 flex-shrink-0" />
              <span className="text-slate-300">{feature}</span>
            </div>
          ))}
        </div>
      </div>
      
      <button
        className={cn(
          "w-full py-3 mt-4 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center",
          isLoading ? "opacity-70 cursor-not-allowed" : "",
          plan.is_popular
            ? "bg-yellow-400 hover:bg-yellow-300 text-black"
            : "bg-slate-700 hover:bg-slate-600 text-white"
        )}
        onClick={onSubscribe}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
        ) : null}
        {isActive ? "Switch Plan" : "Get Started"}
      </button>
    </div>
  );
}

/**
 * Check icon component for feature list
 * @param props - SVG props
 * @returns {JSX.Element} The rendered check icon
 */
function Check(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg 
      {...props}
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
