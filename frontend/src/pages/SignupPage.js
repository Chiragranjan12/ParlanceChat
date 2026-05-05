import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, MessageSquare } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function SignupPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", username: "", displayName: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const update = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setIsLoading(true);
    try {
      await register(form.email, form.username, form.password, form.displayName || form.username);
      navigate("/");
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : Array.isArray(detail) ? detail.map(d => d.msg || d).join(", ") : "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen w-full flex overflow-hidden bg-[#09090b]">
      <div
        className="hidden lg:flex lg:w-1/2 relative flex-col items-center justify-center p-12"
        style={{
          backgroundImage: `linear-gradient(to bottom right, rgba(99,102,241,0.15), rgba(9,9,11,0.9)), url(https://images.unsplash.com/photo-1760992795200-52321e30d64c?crop=entropy&cs=srgb&fm=jpg&q=85)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#6366f1] flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-500/30">
            <MessageSquare className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-outfit text-5xl font-bold text-white mb-4 tracking-tight">Join Parlance</h1>
          <p className="text-[#a1a1aa] text-lg max-w-sm mx-auto leading-relaxed">
            Create your account and start chatting instantly. No email verification needed.
          </p>
        </motion.div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 overflow-y-auto">
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }} className="w-full max-w-md py-8">
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 rounded-xl bg-[#6366f1] flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <span className="font-outfit text-2xl font-bold text-white">Parlance</span>
          </div>

          <h2 className="font-outfit text-3xl font-bold text-white mb-2">Create account</h2>
          <p className="text-[#a1a1aa] mb-8">Join Parlance to start messaging</p>

          {error && (
            <div data-testid="signup-error" className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#a1a1aa] mb-1.5">Email</label>
              <input data-testid="signup-email-input" type="email" value={form.email} onChange={update("email")} placeholder="you@example.com" required className="w-full px-4 py-3 rounded-lg bg-[#18181b] border border-[#27272a] text-white placeholder-[#52525b] focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1] transition-colors" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#a1a1aa] mb-1.5">Username</label>
              <input data-testid="signup-username-input" type="text" value={form.username} onChange={update("username")} placeholder="yourusername" required className="w-full px-4 py-3 rounded-lg bg-[#18181b] border border-[#27272a] text-white placeholder-[#52525b] focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1] transition-colors" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#a1a1aa] mb-1.5">Display Name <span className="text-[#52525b]">(optional)</span></label>
              <input data-testid="signup-displayname-input" type="text" value={form.displayName} onChange={update("displayName")} placeholder="Your Name" className="w-full px-4 py-3 rounded-lg bg-[#18181b] border border-[#27272a] text-white placeholder-[#52525b] focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1] transition-colors" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#a1a1aa] mb-1.5">Password</label>
              <div className="relative">
                <input data-testid="signup-password-input" type={showPass ? "text" : "password"} value={form.password} onChange={update("password")} placeholder="Min. 8 characters" required className="w-full px-4 py-3 pr-12 rounded-lg bg-[#18181b] border border-[#27272a] text-white placeholder-[#52525b] focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1] transition-colors" />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#52525b] hover:text-[#a1a1aa] transition-colors">
                  {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button data-testid="signup-submit-button" type="submit" disabled={isLoading} className="w-full py-3 rounded-lg bg-[#6366f1] hover:bg-[#4f46e5] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-colors duration-200 mt-2">
              {isLoading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="text-center text-[#a1a1aa] text-sm mt-6">
            Already have an account?{" "}
            <Link data-testid="login-link" to="/login" className="text-[#818cf8] hover:text-[#6366f1] font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
