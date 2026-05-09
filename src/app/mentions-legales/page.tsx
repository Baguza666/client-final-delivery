import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft } from 'lucide-react'

export const metadata = {
    title: 'Mentions légales — Invoicify',
    description: 'Mentions légales et politique de confidentialité d\'Invoicify.',
}

export default function MentionsLegalesPage() {
    return (
        <div className="min-h-screen bg-[#020617] text-white">
            <header className="fixed top-0 inset-x-0 z-50 h-14 flex items-center px-6 lg:px-12 border-b border-white/[0.06] bg-[#020617]/80 backdrop-blur-xl">
                <div className="max-w-3xl mx-auto w-full flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        Retour
                    </Link>
                    <Image
                        src="/invoicify-logo.png"
                        alt="Invoicify"
                        width={120}
                        height={24}
                        className="h-6 w-auto object-contain"
                    />
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-6 lg:px-12 pt-28 pb-24">
                <h1 className="text-4xl font-extrabold mb-2">Mentions légales</h1>
                <p className="text-white/40 text-sm mb-12">Dernière mise à jour : 7 mai 2026</p>

                <h2 className="font-heading text-2xl font-bold mt-10 mb-3">Éditeur du site</h2>
                <p className="text-white/70 leading-relaxed">
                    Invoicify — service de facturation en ligne pour entrepreneurs marocains.<br />
                    Contact : <a href="mailto:hello@invoicify.ma" className="text-primary hover:underline">hello@invoicify.ma</a>
                </p>
                <p className="text-white/50 text-sm mt-2">
                    Les coordonnées légales complètes (raison sociale, ICE, RC, IF, siège social) seront publiées au lancement officiel du service.
                </p>

                <h2 className="font-heading text-2xl font-bold mt-10 mb-3">Hébergement</h2>
                <p className="text-white/70 leading-relaxed">
                    Site hébergé par Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis. Base de données hébergée par Supabase.
                </p>

                <h2 className="font-heading text-2xl font-bold mt-10 mb-3">Données personnelles</h2>
                <p className="text-white/70 leading-relaxed">
                    En vous inscrivant à la liste d&apos;attente, vous nous communiquez votre adresse email. Cette donnée est utilisée
                    exclusivement pour :
                </p>
                <ul className="text-white/70 leading-relaxed list-disc pl-6 space-y-1">
                    <li>vous envoyer un email de confirmation immédiat ;</li>
                    <li>vous transmettre votre lien d&apos;accès le jour du lancement ;</li>
                    <li>vous tenir informé d&apos;éventuelles évolutions importantes du produit avant le lancement.</li>
                </ul>
                <p className="text-white/70 leading-relaxed mt-4">
                    Aucune donnée n&apos;est revendue, partagée avec des tiers à des fins commerciales, ni utilisée pour de la
                    publicité externe. Conformément à la loi 09-08 relative à la protection des personnes physiques à l&apos;égard
                    du traitement des données à caractère personnel, vous disposez d&apos;un droit d&apos;accès, de rectification
                    et de suppression de vos données.
                </p>

                <h2 className="font-heading text-2xl font-bold mt-10 mb-3">Suppression des données</h2>
                <p className="text-white/70 leading-relaxed">
                    Pour demander la suppression de votre adresse email de notre liste, envoyez un email à{' '}
                    <a href="mailto:hello@invoicify.ma" className="text-primary hover:underline">hello@invoicify.ma</a> avec
                    pour objet « Suppression de mes données ». Votre demande est traitée sous 7 jours ouvrés.
                </p>

                <h2 className="font-heading text-2xl font-bold mt-10 mb-3">Cookies</h2>
                <p className="text-white/70 leading-relaxed">
                    Cette page utilise uniquement les cookies techniques nécessaires à son fonctionnement (session anti-spam
                    Cloudflare Turnstile). Aucun cookie de tracking publicitaire n&apos;est déposé.
                </p>

                <h2 className="font-heading text-2xl font-bold mt-10 mb-3">Propriété intellectuelle</h2>
                <p className="text-white/70 leading-relaxed">
                    L&apos;ensemble du contenu de ce site (textes, design, logo) est protégé par le droit d&apos;auteur. Toute
                    reproduction non autorisée est interdite.
                </p>
            </main>
        </div>
    )
}
