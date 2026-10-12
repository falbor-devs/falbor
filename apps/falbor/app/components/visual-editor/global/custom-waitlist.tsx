'use client'
import React, { useState } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { toast } from 'sonner'
import { Loader2, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react'
import { joinWaitlistAction, getWaitlistCount } from '~/lib/visual-editor/actions/waitlist'

export const CustomWaitlist = () => {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [count, setCount] = useState(80)

  React.useEffect(() => {
    getWaitlistCount().then(setCount)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const result = await joinWaitlistAction(email)
    if (result.success) {
      setSubmitted(true)
      setCount((prev) => prev + 1)
      toast.success('Welcome aboard!')
    } else {
      toast.error(result.error || 'Something went wrong')
    }
    setLoading(false)
  }

  if (submitted) {
    return (
      <div className="max-w-md w-full bg-black/80 backdrop-blur-2xl border border-white/10 p-12 rounded-[2.5rem] shadow-2xl text-center animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto border border-green-500/20 mb-6">
          <CheckCircle2 className="text-green-500 w-10 h-10" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">You're on the list!</h2>
        <p className="text-gray-400">Check your inbox soon for your exclusive invite.</p>
      </div>
    )
  }

  return (
    <div className="max-w-md w-full relative group animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {}
      {}

      <div className="relative dark:bg-black/90 bg-white backdrop-blur-3xl border border-black/30 p-10 rounded-sm overflow-hidden">
        {}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16" />

        <div className="relative z-10 space-y-8">
          <div className="text-center space-y-3">
            <h2 className="text-4xl font-bold tracking-tight text-black/70 dark:text-white leading-[1.1]">
              The Future of <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-400 to-primary animate-gradient">
                Web Building.
              </span>
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed px-4">
              Join the elite circle of creators building the next generation of the web.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative group/input">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="pr-32" 
              />

              <Button
                type="submit"
                disabled={loading}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 px-3"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span className="flex items-center gap-1 text-sm">
                    Join Waitlist
                    <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
      <div className="pt-4 flex flex-col items-center gap-3">
        <p className="text-[17px] text-gray-500 font-medium">
          Join <span className="dark:text-white text-black font-bold">{count.toLocaleString()}+</span> visionary builders
        </p>
      </div>
    </div>
  )
}
