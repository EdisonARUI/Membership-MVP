"use client";

import { Check, Sparkles, Zap, Shield } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";

const plans = [
  {
    name: "月付",
    price: "¥35",
    period: "每月",
    features: [
      "基础分析仪表盘",
      "最多5名团队成员",
      "2GB存储空间",
      "邮件支持"
    ]
  },
  {
    name: "季付",
    price: "¥99",
    period: "每季度",
    popular: true,
    features: [
      "高级分析功能",
      "最多15名团队成员",
      "10GB存储空间",
      "优先邮件支持",
      "API访问权限"
    ]
  },
  {
    name: "年付",
    price: "¥365",
    period: "每年",
    features: [
      "企业级分析",
      "无限团队成员",
      "50GB存储空间",
      "24/7优先支持",
      "API访问权限",
      "自定义集成"
    ]
  }
];

export default function Home() {
  const [hoveredPlan, setHoveredPlan] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <header className="w-full py-4 px-8 border-b border-slate-700">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2 text-xl font-bold">
            <Sparkles className="h-6 w-6 text-yellow-400" />
            <span>会员订阅</span>
          </Link>
          <div className="flex items-center space-x-4">
            <Link 
              href="/sign-in"
              className="px-4 py-2 text-white hover:text-yellow-400 transition-colors"
            >
              登录
            </Link>
            <Link 
              href="/sign-up"
              className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-black rounded-lg font-medium transition-colors"
            >
              注册
            </Link>
          </div>
        </div>
      </header>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-20">
          <div className="flex items-center justify-center mb-4">
            <Sparkles className="h-8 w-8 text-yellow-400 mr-2" />
            <h1 className="text-4xl font-bold">选择您的完美套餐</h1>
          </div>
          <p className="text-slate-400 text-lg mt-4 max-w-2xl mx-auto">
            解锁高级功能，通过我们灵活的订阅计划将您的体验提升到新的水平。
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <div
              key={plan.name}
              className={cn(
                "relative rounded-2xl p-8 transition-all duration-300",
                "bg-gradient-to-b from-slate-800 to-slate-900",
                "border border-slate-700 hover:border-slate-500",
                hoveredPlan === index ? "transform scale-105" : "",
                plan.popular ? "ring-2 ring-yellow-400" : ""
              )}
              onMouseEnter={() => setHoveredPlan(index)}
              onMouseLeave={() => setHoveredPlan(null)}
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
                  <span className="text-slate-400 ml-2">{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center">
                    <Check className="h-5 w-5 text-green-400 mr-2 flex-shrink-0" />
                    <span className="text-slate-300">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                className={cn(
                  "w-full py-3 rounded-lg font-semibold transition-all duration-300",
                  plan.popular
                    ? "bg-yellow-400 hover:bg-yellow-300 text-black"
                    : "bg-slate-700 hover:bg-slate-600 text-white"
                )}
              >
                立即开始
              </button>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <div className="inline-flex items-center space-x-2 bg-slate-800 px-6 py-3 rounded-lg">
            <Shield className="h-5 w-5 text-green-400" />
            <span className="text-slate-300">30天退款保证</span>
          </div>
        </div>
      </div>
    </div>
  );
}