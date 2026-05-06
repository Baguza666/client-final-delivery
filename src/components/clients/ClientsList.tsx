'use client'

import ClientCard, { ClientStats } from './ClientCard'

interface ClientsListProps {
    clients: any[]
    statsById: Record<string, ClientStats>
    selectedIds: Set<string>
    selectionMode: boolean
    onOpen: (client: any) => void
    onEdit: (client: any) => void
    onDelete: (client: any) => void
    onToggleSelect: (id: string) => void
}

export default function ClientsList({
    clients,
    statsById,
    selectedIds,
    selectionMode,
    onOpen,
    onEdit,
    onDelete,
    onToggleSelect,
}: ClientsListProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clients.map((client) => (
                <ClientCard
                    key={client.id}
                    client={client}
                    stats={statsById[client.id]}
                    selected={selectedIds.has(client.id)}
                    selectionMode={selectionMode}
                    onOpen={() => onOpen(client)}
                    onEdit={() => onEdit(client)}
                    onDelete={() => onDelete(client)}
                    onToggleSelect={() => onToggleSelect(client.id)}
                />
            ))}
        </div>
    )
}
