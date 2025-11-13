// app/auth/signup/page.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getApp as getApp2, getApps as getApps2, initializeApp as initializeApp2 } from 'firebase/app'
import { getAuth as getAuth2, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'

const clientConfig2 = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
}
function appInst2() { return getApps2().length ? getApp2() : initializeApp2(clientConfig2) }

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const auth = getAuth2(appInst2())
      const cred = await createUserWithEmailAndPassword(auth, email, password)
      if (displayName) await updateProfile(cred.user, { displayName })
      router.push('/settings')
    } catch (e: any) {
      setError(e?.message || '회원가입 실패')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-sm mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">회원가입</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input type="text" placeholder="닉네임 (선택)" value={displayName} onChange={(e)=>setDisplayName(e.target.value)} className="w-full border rounded-xl p-3" />
        <input type="email" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} className="w-full border rounded-xl p-3" />
        <input type="password" placeholder="Password" value={password} onChange={(e)=>setPassword(e.target.value)} className="w-full border rounded-xl p-3" />
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <button disabled={loading} className="w-full border rounded-xl p-3 shadow">회원가입</button>
      </form>
    </div>
  )
}
