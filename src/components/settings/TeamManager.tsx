'use client';

import { useState } from 'react';
import { updateUserRole } from '@/app/actions/admin';

interface Profile {
    id: string;
    email: string;
    role: 'admin' | 'editor' | 'viewer' | 'pending';
    created_at: string;
}

export default function TeamManager({ profiles, currentUserId }: { profiles: Profile[], currentUserId: string }) {
    const [loadingId, setLoadingId] = useState<string | null>(null);

    const handleRoleChange = async (userId: string, newRole: string) => {
        setLoadingId(userId);
        await updateUserRole(userId, newRole);
        setLoadingId(null);
    };

    return (
        <div className="glass-card p-8 rounded-3xl border border-white/5">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">group_add</span>
                        Gestion de l'Équipe
                    </h3>
                    <p className="text-text-secondary text-xs mt-1">Gérez les accès et les permissions.</p>
                </div>
                <div className="text-xs font-bold bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/20">
                    {profiles.length} Utilisateurs
                </div>
            </div>

            <div className="flex flex-col gap-3">
                {profiles.map((profile) => (
                    <div
                        key={profile.id}
                        className={`flex flex-col md:flex-row items-center justify-between p-4 rounded-xl border transition-all ${profile.role === 'pending'
                                ? 'bg-red-500/5 border-red-500/20'
                                : 'bg-white/5 border-white/5'
                            }`}
                    >
                        {/* User Info */}
                        <div className="flex items-center gap-4 w-full md:w-auto mb-4 md:mb-0">
                            <div className={`size-10 rounded-full flex items-center justify-center font-bold text-sm ${profile.role === 'pending' ? 'bg-red-500/10 text-red-500' : 'bg-white/10 text-white'
                                }`}>
                                {profile.email.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <p className="text-white text-sm font-medium">{profile.email}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                    {profile.id === currentUserId && <span className="text-[10px] bg-white/20 px-1.5 rounded text-white">Vous</span>}
                                    <span className="text-[10px] text-text-secondary">Inscrit le {new Date(profile.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            {profile.role === 'pending' && (
                                <div className="flex items-center gap-2 mr-2 animate-pulse">
                                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                    <span className="text-xs text-red-500 font-bold uppercase">En Attente</span>
                                </div>
                            )}

                            <select
                                disabled={loadingId === profile.id || profile.id === currentUserId}
                                value={profile.role}
                                onChange={(e) => handleRoleChange(profile.id, e.target.value)}
                                className="bg-black/40 border border-white/10 text-white text-xs rounded-lg px-3 py-2 outline-none focus:border-primary cursor-pointer disabled:opacity-50"
                            >
                                <option value="pending">En attente</option>
                                <option value="viewer">Viewer (Lecture seule)</option>
                                <option value="editor">Editor (Modification)</option>
                                <option value="admin">Admin (Accès total)</option>
                            </select>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}