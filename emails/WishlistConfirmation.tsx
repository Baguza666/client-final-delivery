import {
    Body,
    Container,
    Head,
    Heading,
    Hr,
    Html,
    Link,
    Preview,
    Section,
    Tailwind,
    Text,
} from '@react-email/components'
import * as React from 'react'

export type WishlistConfirmationProps = {
    firstName?: string
    position: number
    daysUntilLaunch: number
    launchDateLabel: string
}

export const WishlistConfirmation = ({
    firstName,
    position,
    daysUntilLaunch,
    launchDateLabel,
}: WishlistConfirmationProps) => {
    const greeting = firstName ? `Bonjour ${firstName},` : 'Bonjour,'

    return (
        <Html lang="fr">
            <Head />
            <Preview>
                Votre tarif fondateur est gelé. Lien d&apos;accès envoyé le {launchDateLabel}.
            </Preview>
            <Tailwind>
                <Body className="bg-[#020617] font-sans text-white" style={bodyStyle}>
                    <Container className="mx-auto max-w-[560px] px-6 py-12">
                        {/* Logo / wordmark */}
                        <Section className="mb-10">
                            <Text
                                className="m-0 text-2xl font-extrabold tracking-tight"
                                style={{
                                    backgroundImage: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                                    backgroundClip: 'text',
                                    WebkitBackgroundClip: 'text',
                                    color: 'transparent',
                                }}
                            >
                                Invoicify
                            </Text>
                        </Section>

                        {/* Hero card */}
                        <Section
                            className="rounded-[20px] border border-solid p-8"
                            style={{
                                borderColor: 'rgba(99,102,241,0.3)',
                                backgroundImage:
                                    'linear-gradient(135deg, rgba(99,102,241,0.10) 0%, rgba(139,92,246,0.06) 100%)',
                            }}
                        >
                            <Text className="m-0 mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#A5B4FC]">
                                Tarif fondateur · gelé
                            </Text>
                            <Heading
                                as="h1"
                                className="m-0 text-[28px] font-extrabold leading-[1.15] tracking-tight text-white"
                            >
                                Vous êtes inscrit. Votre tarif est verrouillé.
                            </Heading>
                            <Text className="mb-0 mt-4 text-[15px] leading-[1.6] text-white/70">
                                {greeting} merci de rejoindre la liste Invoicify. Le jour du lancement, le{' '}
                                <strong className="text-white">{launchDateLabel}</strong>, vous recevez votre lien d&apos;accès —
                                <strong className="text-white"> 48h avant tout le monde</strong> — et votre tarif fondateur reste
                                figé : <strong className="text-white">50% de réduction sur le tarif Pro</strong>, tant que votre
                                abonnement reste actif.
                            </Text>
                        </Section>

                        {/* Stats */}
                        <Section className="mt-6 rounded-[16px] border border-solid border-white/10 bg-white/[0.03] p-6">
                            <table cellPadding={0} cellSpacing={0} width="100%" style={{ borderCollapse: 'collapse' }}>
                                <tbody>
                                    <tr>
                                        <td align="center" width="33%" style={{ padding: '0 8px' }}>
                                            <Text
                                                className="m-0 text-3xl font-extrabold leading-none"
                                                style={gradientNumber}
                                            >
                                                {daysUntilLaunch}
                                            </Text>
                                            <Text className="m-0 mt-2 text-[10px] uppercase tracking-wider text-white/40">
                                                jours avant le lancement
                                            </Text>
                                        </td>
                                        <td align="center" width="33%" style={{ padding: '0 8px' }}>
                                            <Text
                                                className="m-0 text-3xl font-extrabold leading-none"
                                                style={gradientNumber}
                                            >
                                                #{position}
                                            </Text>
                                            <Text className="m-0 mt-2 text-[10px] uppercase tracking-wider text-white/40">
                                                votre place dans la file
                                            </Text>
                                        </td>
                                        <td align="center" width="33%" style={{ padding: '0 8px' }}>
                                            <Text
                                                className="m-0 text-3xl font-extrabold leading-none"
                                                style={gradientNumber}
                                            >
                                                ∞
                                            </Text>
                                            <Text className="m-0 mt-2 text-[10px] uppercase tracking-wider text-white/40">
                                                votre tarif, à vie
                                            </Text>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </Section>

                        {/* Founder note */}
                        <Section className="mt-8">
                            <Text className="m-0 mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[#A5B4FC]">
                                Une question rapide
                            </Text>
                            <Text className="m-0 text-[15px] leading-[1.65] text-white/70">
                                Qu&apos;est-ce qui vous fait perdre le plus de temps dans votre facturation aujourd&apos;hui ?
                            </Text>
                            <Text className="m-0 mt-3 text-[15px] leading-[1.65] text-white/70">
                                Répondez directement à cet email — je lis chaque réponse personnellement, et vos retours
                                orientent les premières fonctionnalités d&apos;Invoicify.
                            </Text>
                        </Section>

                        <Section className="mt-8">
                            <Text className="m-0 text-[15px] text-white/80">À très vite,</Text>
                            <Text className="m-0 mt-1 text-[15px] font-semibold text-white">
                                Hicham — Fondateur, Invoicify
                            </Text>
                        </Section>

                        <Hr className="my-10 border-white/10" />

                        {/* Footer */}
                        <Section>
                            <Text className="m-0 text-[11px] leading-[1.6] text-white/35">
                                Vous recevez cet email parce que vous vous êtes inscrit à la liste d&apos;attente
                                d&apos;Invoicify. Pour vous désinscrire,{' '}
                                <Link
                                    href="mailto:hello@invoicify.ma?subject=unsubscribe"
                                    className="text-white/55 underline"
                                >
                                    cliquez ici
                                </Link>{' '}
                                ou répondez « STOP » à cet email.
                            </Text>
                            <Text className="m-0 mt-2 text-[11px] leading-[1.6] text-white/35">
                                <Link
                                    href="https://invoicify.ma/mentions-legales"
                                    className="text-white/55 underline"
                                >
                                    Mentions légales
                                </Link>{' '}
                                · © 2026 Invoicify · Casablanca, Maroc
                            </Text>
                        </Section>
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    )
}

const bodyStyle: React.CSSProperties = {
    backgroundColor: '#020617',
    margin: 0,
    padding: 0,
}

const gradientNumber: React.CSSProperties = {
    backgroundImage: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    color: 'transparent',
    fontSize: '32px',
    fontWeight: 800,
    lineHeight: 1,
}

WishlistConfirmation.PreviewProps = {
    firstName: 'Hicham',
    position: 47,
    daysUntilLaunch: 21,
    launchDateLabel: '28 mai 2026',
} satisfies WishlistConfirmationProps

export default WishlistConfirmation
