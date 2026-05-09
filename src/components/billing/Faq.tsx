'use client'

import { useState } from 'react'

interface FaqItem {
    q: string
    a: React.ReactNode
}

const FAQ: FaqItem[] = [
    {
        q: 'Comment fonctionne la version gratuite ?',
        a: (
            <>
                <p>
                    La version Gratuite vous permet de créer jusqu&apos;à 10 factures par mois, indéfiniment. Toutes les factures portent un petit filigrane &laquo; Créé avec Invoicify &raquo; en bas de page.
                </p>
                <p className="mt-2">
                    Les fonctionnalités Pro (devis, bons de commande, dépenses, rapports, assistant IA) restent visibles dans la barre latérale mais nécessitent un abonnement pour être utilisées.
                </p>
            </>
        ),
    },
    {
        q: 'Que se passe-t-il si je dépasse 10 factures par mois ?',
        a: (
            <p>
                À 10/10 factures, le bouton &laquo; Nouvelle facture &raquo; affiche une fenêtre Pro. Vos 10 factures restent intactes : vous pouvez les consulter, les imprimer, les envoyer. Le compteur se réinitialise le 1er du mois suivant.
            </p>
        ),
    },
    {
        q: 'Puis-je annuler à tout moment ?',
        a: (
            <p>
                Oui. Sur la page <code>/billing</code>, un bouton Annuler met fin à votre abonnement à la fin de la période en cours (pas de remboursement après 30 jours). Vos données restent accessibles en lecture seule sur le tier Gratuit.
            </p>
        ),
    },
    {
        q: 'Est-ce que je peux récupérer mon argent si je n\'aime pas ?',
        a: (
            <>
                <p className="font-semibold">Garantie 30 jours satisfait ou remboursé.</p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                    <li><strong>Avant 30 jours :</strong> remboursement complet sur simple demande, downgrade immédiat.</li>
                    <li><strong>30 jours → fin de période :</strong> pas de remboursement, accès jusqu&apos;à la fin de la période payée.</li>
                    <li><strong>Après fin de période (annuel inutilisé) :</strong> pas de remboursement ; un crédit sur compte est possible si vous revenez sous 12 mois.</li>
                    <li><strong>Panne de service &gt; 4h cumulées/mois :</strong> crédit automatique appliqué au prochain renouvellement.</li>
                    <li><strong>Force majeure</strong> (cessation d&apos;activité, décès) : étude au cas par cas, généralement remboursement au prorata.</li>
                </ul>
            </>
        ),
    },
    {
        q: 'Mes factures sont-elles conformes DGI ?',
        a: (
            <p>
                Invoicify est <strong>architecté pour la facturation électronique DGI 2026</strong> : ICE, IF, RC, CNSS, code de type document, taux de TVA canoniques (0/7/10/14/20). Le décret d&apos;application n&apos;est pas encore publié à la date de lancement ; nous activons l&apos;intégration DGI dès que la spécification UBL 2.1 est officielle.
            </p>
        ),
    },
    {
        q: 'Pourquoi je paie en USD/MAD via Lemon Squeezy ?',
        a: (
            <p>
                Lemon Squeezy est notre Merchant of Record : ils gèrent la facturation, la fiscalité internationale, et acceptent les cartes marocaines. Si votre carte facture en USD, votre banque applique des frais de change habituels (~1-3%). Pour de la facturation en MAD natif, basculez vers une banque qui supporte les paiements internationaux multidevises.
            </p>
        ),
    },
    {
        q: 'Comment redeem mon code FOUNDER30 ?',
        a: (
            <p>
                Si vous êtes inscrit sur la wishlist avant le lancement, votre email donne droit au code <code>FOUNDER30</code> : 30% de remise <strong>à vie</strong> sur Pro ou Business, mensuel ou annuel. Le code est appliqué automatiquement si vous arrivez via votre email d&apos;invitation. Sinon, entrez-le manuellement à la caisse Lemon Squeezy. Cohorte fermée 90 jours après le lancement.
            </p>
        ),
    },
    {
        q: 'Que se passe-t-il si je redowngrade vers Gratuit ?',
        a: (
            <p>
                Vos données sont préservées. Vous gardez un accès <strong>en lecture seule</strong> à vos anciens devis, bons de commande, dépenses, rapprochements et conversations IA. Pour modifier ou créer de nouveaux documents Pro, réactivez votre abonnement — et vous retrouvez tout immédiatement, code FOUNDER30 inclus.
            </p>
        ),
    },
    {
        q: 'Puis-je avoir une facture comptable marocaine ?',
        a: (
            <p>
                Oui. Chaque paiement Lemon Squeezy déclenche automatiquement une <strong>facture marocaine au format auto-entrepreneur</strong> (numérotation séquentielle annuelle <code>FAC-AE-2026-XXXXX</code>, mention &laquo; TVA non applicable selon article 91 du CGI &raquo;). Téléchargeable depuis <code>/billing</code>.
            </p>
        ),
    },
    {
        q: 'Comment vous contacter ?',
        a: (
            <p>
                <strong>WhatsApp :</strong> <a href="https://wa.me/212600000000" className="text-primary hover:underline">+212 6 00 00 00 00</a> · <strong>Email :</strong> <a href="mailto:support@invoicify.ma" className="text-primary hover:underline">support@invoicify.ma</a>. Réponse sous 24h, en français.
            </p>
        ),
    },
]

export default function Faq() {
    const [open, setOpen] = useState<number | null>(0)
    return (
        <section className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-2">Questions fréquentes</h2>
            <p className="text-center text-white/60 mb-10">Tout ce que vous devez savoir avant de vous abonner.</p>
            <div className="space-y-3">
                {FAQ.map((item, i) => (
                    <div
                        key={i}
                        className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden"
                    >
                        <button
                            type="button"
                            onClick={() => setOpen(open === i ? null : i)}
                            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/[0.03] transition"
                            aria-expanded={open === i}
                        >
                            <span className="font-semibold pr-4">{item.q}</span>
                            <span
                                className={`material-symbols-outlined transition-transform ${
                                    open === i ? 'rotate-180' : ''
                                }`}
                            >
                                expand_more
                            </span>
                        </button>
                        {open === i && (
                            <div className="px-5 pb-5 text-sm text-white/70 leading-relaxed space-y-2">
                                {item.a}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </section>
    )
}
