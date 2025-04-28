import Link from "next/link";
import { useUser } from "@/hooks/use-user";

export function Navbar() {
  const { user } = useUser();
  
  return (
    <nav className="bg-slate-900 py-4">
      <div className="container mx-auto flex justify-between items-center px-4">
        <Link href="/" className="text-xl font-bold">Web3会员系统</Link>
        
        <div className="flex gap-4">
          {user ? (
            <>
              <Link href="/profile" className="text-white hover:text-yellow-400">
                个人资料
              </Link>
              <form action="/auth/signout" method="post">
                <button type="submit" className="text-white hover:text-red-400">
                  退出
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/sign-in" className="text-white hover:text-yellow-400">
                登录
              </Link>
              <Link href="/sign-up" className="text-white hover:text-yellow-400">
                注册
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
