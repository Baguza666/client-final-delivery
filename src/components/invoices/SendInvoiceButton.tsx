'use client';

import { useState } from 'react';
import { sendEmail } from '@/app/actions/sendEmail';
import { useModal } from '@/components/ui/ModalProvider';

export default function SendInvoiceButton({
    clientEmail,
    clientName,
    invoiceNumber,
    amount
}: {
    clientEmail: string,
    clientName: string,
    invoiceNumber: string,
    amount: number
}) {
    const [loading, setLoading] = useState(false);
    const { showModal } = useModal();

    // DEFINE YOUR CC ADDRESS HERE (Or fetch it from settings later)
    const MY_CC_EMAIL = "hichamzineddine2@gmail.com";

    const handleSend = () => {
        // 1. Check if Client Email exists
        if (!clientEmail || clientEmail === 'pending@example.com') {
            showModal({
                title: "Email Client Manquant",
                message: `Le client "${clientName}" n'a pas d'email valide enregistré. Veuillez modifier le client dans l'onglet Clients.`,
                type: "error"
            });
            return;
        }

        // 2. Show Confirmation
        showModal({
            title: "Confirmer l'envoi",
            message: `Envoyer la facture #${invoiceNumber} à ${clientEmail} ? (Une copie sera envoyée à ${MY_CC_EMAIL})`,
            type: "confirm",
            confirmText: "Envoyer",
            onConfirm: async () => {
                setLoading(true);

                const result = await sendEmail({
                    to: clientEmail,
                    cc: MY_CC_EMAIL, // <--- Sending the CC
                    subject: `Facture #${invoiceNumber} - IMSAL Services`,
                    html: `
            <div style="font-family: Arial, sans-serif; color: #333;">
              <h2>Bonjour ${clientName},</h2>
              <p>Veuillez trouver ci-joint votre facture <strong>#${invoiceNumber}</strong> d'un montant de <strong>${amount} Dh</strong>.</p>
              <br>
              <p>Cordialement,<br><strong>L'équipe IMSAL Services</strong></p>
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
            className="text-text-secondary hover:text-primary transition-colors disabled:opacity-50"
            title="Envoyer par email"
        >
            <span className="material-symbols-outlined text-[20px]">
                {loading ? 'hourglass_top' : 'send'}
            </span>
        </button>
    );
}