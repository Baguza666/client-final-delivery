'use client';

import { useState } from 'react';
import { sendEmail } from '@/app/actions/sendEmail';
import { useModal } from '@/components/ui/ModalProvider';

export default function SendInvoiceButton({
    clientEmail,
    clientName,
    invoiceNumber,
    amount,
    workspaceName,
    ccEmail,
}: {
    clientEmail: string,
    clientName: string,
    invoiceNumber: string,
    amount: number,
    workspaceName?: string,
    ccEmail?: string,
}) {
    const [loading, setLoading] = useState(false);
    const { showModal } = useModal();

    const senderLabel = workspaceName?.trim() || 'notre équipe';

    const handleSend = () => {
        if (!clientEmail || clientEmail === 'pending@example.com') {
            showModal({
                title: "Email Client Manquant",
                message: `Le client "${clientName}" n'a pas d'email valide enregistré. Veuillez modifier le client dans l'onglet Clients.`,
                type: "error"
            });
            return;
        }

        const ccNotice = ccEmail ? ` (Une copie sera envoyée à ${ccEmail})` : '';

        showModal({
            title: "Confirmer l'envoi",
            message: `Envoyer la facture #${invoiceNumber} à ${clientEmail} ?${ccNotice}`,
            type: "confirm",
            confirmText: "Envoyer",
            onConfirm: async () => {
                setLoading(true);

                const subjectSuffix = workspaceName ? ` — ${workspaceName}` : '';
                const result = await sendEmail({
                    to: clientEmail,
                    cc: ccEmail,
                    subject: `Facture #${invoiceNumber}${subjectSuffix}`,
                    html: `
            <div style="font-family: Arial, sans-serif; color: #333;">
              <h2>Bonjour ${clientName},</h2>
              <p>Veuillez trouver ci-joint votre facture <strong>#${invoiceNumber}</strong> d'un montant de <strong>${amount} Dh</strong>.</p>
              <br>
              <p>Cordialement,<br><strong>${senderLabel}</strong></p>
            </div>
          `
                });

                setLoading(false);

                showModal({
                    title: result.success ? "Envoyé !" : "Erreur",
                    message: result.message,
                    type: result.success ? "success" : "error"
                });
            }
        });
    };

    return (
        <button
            onClick={handleSend}
            disabled={loading}
            className="text-zinc-500 hover:text-primary transition-colors disabled:opacity-50"
            title="Envoyer par email"
        >
            <span className="material-symbols-outlined text-[20px]">
                {loading ? 'hourglass_top' : 'send'}
            </span>
        </button>
    );
}