import { Suspense } from 'react'
import LoginForm from './LoginForm'

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#07070B] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-zinc-800 border-t-primary rounded-full animate-spin" />
            </div>
        }>
            <LoginForm />
        </Suspense>
    )
}
