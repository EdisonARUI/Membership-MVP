import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

type PlanCardProps = {
  plan: {
    name: string;
    price: string;
    period: string;
    popular?: boolean;
  };
  isHovered: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onSubscribe: () => void;
  isActive: boolean;
};

export function PlanCard({ 
  plan, 
  isHovered, 
  onMouseEnter, 
  onMouseLeave, 
  onSubscribe,
  isActive
}: PlanCardProps) {
  return (
    <div className="flex flex-col">
      <div
        className={cn(
          "relative rounded-2xl p-8 transition-all duration-300",
          "bg-gradient-to-b from-slate-800 to-slate-900",
          "border border-slate-700 hover:border-slate-500",
          isHovered ? "transform scale-105" : "",
          plan.popular ? "ring-2 ring-yellow-400" : ""
        )}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {plan.popular && (
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
            <span className="bg-yellow-400 text-black px-3 py-1 rounded-full text-sm font-medium flex items-center">
              <Zap className="h-4 w-4 mr-1" />
              最受欢迎
            </span>
          </div>
        )}

        <div className="text-center mb-8">
          <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
          <div className="flex items-center justify-center">
            <span className="text-4xl font-bold">{plan.price}</span>
            <span className="text-slate-400 ml-2">
              {plan.period === 'monthly' ? '每月' : plan.period === 'quarterly' ? '每季度' : '每年'}
            </span>
          </div>
        </div>
      </div>
      
      <button
        className={cn(
          "w-full py-3 mt-4 rounded-lg font-semibold transition-all duration-300",
          plan.popular
            ? "bg-yellow-400 hover:bg-yellow-300 text-black"
            : "bg-slate-700 hover:bg-slate-600 text-white"
        )}
        onClick={onSubscribe}
      >
        {isActive ? "切换计划" : "立即开始"}
      </button>
    </div>
  );
}
