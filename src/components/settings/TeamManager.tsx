'use client'

import { useState } from 'react'
import { updateUserRole, inviteTeamMember, revokeInvitation } from '@/app/actions/admin'
import { formatDate } from '@/utils/format'

interface Profile {
    id: string
    email: string | null | undefined
    role: 'admin' | 'editor' | 'viewer' | 'pending'
    created_at: string
}

interface Invitation {
    id: string
    email: string
    role: string
    created_at: string
    status: string
}

export default function TeamManager({
    profiles,
    currentUserId,
    invitations = [],
}: {
    profiles: Profile[]
    currentUserId: string
    invitations?: Invitation[]
}) {
    const [loadingId, setLoadingId] = useState<string | null>(null)
    const [showInvite, setShowInvite] = useState(false)
    const [inviteEmail, setInviteEmail] = useState('')
    const [inviteRole, setInviteRole] = useState('editor')
    const [inviteLoading, setInviteLoading] = useState(false)
    const [inviteMsg, setInviteMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
    const [localInvitations, setLocalInvitations] = useState<Invitation[]>(invitations)

    const handleRoleChange = async (userId: string, newRole: string) => {
        setLoadingId(userId)
        await updateUserRole(userId, newRole)
        setLoadingId(null)
    }

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!inviteEmail.trim()) return
        setInviteLoading(true)
        setInviteMsg(null)
        const res = await inviteTeamMember(inviteEmail.trim(), inviteRole)
        setInviteLoading(false)
        if (res.error) {
            setInviteMsg({ type: 'err', text: res.error })
        } else {
            setInviteMsg({ type: 'ok', text: `Invitation enregistree pour ${inviteEmail.trim()}. Demandez-leur de s'inscrire avec cet email.` })
            setLocalInvitations(prev => [...prev.filter(i => i.email !== inviteEmail.toLowerCase().trim()), {
                id: crypto.randomUUID(),
                email: inviteEmail.trim().toLowerCase(),
                role: inviteRole,
                created_at: new Date().toISOString(),
                status: 'pending',
            }])
            setInviteEmail('')
            setShowInvite(false)
        }
    }

    const handleRevoke = async (id: string) => {
        setLoadingId(id)
        await revokeInvitation(id)
        setLocalInvitations(prev => prev.filter(i => i.id !== id))
        setLoadingId(null)
    }

    return (
        <div className="space-y-4">
            {/* Active members */}
            <div className="bg-white/[0.025] border border-white/[0.06] rounded-2xl p-6">
                <div className="flex items-center justify-between mb-5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                        {profiles.length} membre{profiles.length > 1 ? 's' : ''} actif{profiles.length > 1 ? 's' : ''}
                    </span>
                    <button
                        type="button"
                        onClick={() => { setShowInvite(v => !v); setInviteMsg(null) }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-all"
                    >
                        <span className="material-symbols-outlined text-[14px]">person_add</span>
                        Inviter
                    </button>
                </div>

                {/* Invite form */}
                {showInvite && (
                    <form onSubmit={handleInvite} className="mb-5 bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-3">
                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Nouvelle invitation</p>
                        <div className="flex gap-3">
                            <input
                                type="email"
                                required
                                placeholder="email@exemple.com"
                                value={inviteEmail}
                                onChange={e => setInviteEmail(e.target.value)}
                                className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/60 transition-all placeholder:text-zinc-600"
                            />
                            <select
                                value={inviteRole}
                                onChange={e => setInviteRole(e.target.value)}
                                className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white outline-none"
                            >
                                <option value="viewer">Viewer</option>
                                <option value="editor">Editor</option>
                                <option value="admin">Admin</option>
                            </select>
                            <button
                                type="submit"
                                disabled={inviteLoading}
                                className="px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-bold disabled:opacity-50 flex items-center gap-1.5 transition-all"
                            >
                                {inviteLoading ? (
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <span className="material-symbols-outlined text-[16px]">send</span>
                                )}
                                Envoyer
                            </button>
                        </div>
                        {inviteMsg && (
                            <p className={"text-xs px-3 py-2 rounded-lg " + (inviteMsg.type === 'ok' ? "text-green-400 bg-green-500/10" : "text-rose-400 bg-rose-500/10")}>
                                {inviteMsg.text}
                            </p>
                        )}
                    </form>
                )}

                {profiles.length === 0 ? (
                    <p className="text-center text-zinc-500 text-sm py-6">Aucun membre dans l'equipe pour l'instant.</p>
                ) : (
                    <div className="flex flex-col gap-2">
                        {profiles.map((profile) => (
                            <div
                                key={profile.id}
                                className={"flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-xl border transition-all " + (profile.role === 'pending' ? "bg-rose-500/5 border-rose-500/20" : "bg-white/[0.02] border-zinc-800/60")}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={"w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 " + (profile.role === 'pending' ? "bg-rose-500/10 text-rose-400" : "bg-primary/10 text-primary")}>
                                        {(profile.email || '?').charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-white text-sm font-medium">{profile.email || 'Email inconnu'}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            {profile.id === currentUserId && (
                                                <span className="text-[10px] bg-primary/10 text-primary px-1.5 rounded font-bold">Vous</span>
                                            )}
                                            <span className="text-[10px] text-zinc-500">Inscrit le {formatDate(profile.created_at)}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    {profile.role === 'pending' && (
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                                            <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider">En attente</span>
                                        </div>
                                    )}
                                    <select
                                        disabled={loadingId === profile.id || profile.id === currentUserId}
                                        value={profile.role}
                                        onChange={(e) => handleRoleChange(profile.id, e.target.value)}
                                        className="bg-zinc-900 border border-zinc-800 text-white text-xs rounded-lg px-3 py-2 outline-none focus:border-primary cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                    >
                                        <option value="pending">En attente</option>
                                        <option value="viewer">Viewer</option>
                                        <option value="editor">Editor</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Pending invitations */}
            {localInvitations.length > 0 && (
                <div className="bg-white/[0.025] border border-white/[0.06] rounded-2xl p-6">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-4">
                        {localInvitations.length} invitation{localInvitations.length > 1 ? 's' : ''} en attente
                    </p>
                    <div className="flex flex-col gap-2">
                        {localInvitations.map(inv => (
                            <div key={inv.id} className="flex items-center justify-between p-3 rounded-xl bg-amber-500/[0.05] border border-amber-500/20">
                                <div className="flex items-center gap-3">
                                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                                    <div>
                                        <p className="text-sm text-white">{inv.email}</p>
                                        <p className="text-[10px] text-zinc-500">Role: {inv.role} · Invité le {formatDate(inv.created_at)}</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    disabled={loadingId === inv.id}
                                    onClick={() => handleRevoke(inv.id)}
                                    className="text-zinc-600 hover:text-rose-400 transition-colors disabled:opacity-40"
                                    title="Annuler l'invitation"
                                >
                                    <span className="material-symbols-outlined text-[18px]">close</span>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
