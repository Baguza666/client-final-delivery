// React-email template for soft-decline emails.
// Triggered by /api/billing/webhook handleSubscriptionPaymentFailed when
// classifyDeclineReason returns 'soft' (insufficient_funds, exceeds_amount_limit,
// do_not_honor, transaction_not_permitted).

import { Body, Container, Heading, Html, Section, Text, Button, Preview } from '@react-email/components'

interface Props {
    firstName?: string | null
    declineReason: string
    nextRetryAt: string  // ISO date string
    updateCardUrl: string
}

export default function CardFailedSoft({ firstName, declineReason, nextRetryAt, updateCardUrl }: Props) {
    const greeting = firstName ? `Bonjour ${firstName},` : 'Bonjour,'
    return (
        <Html lang="fr">
            <Preview>Votre paiement Invoicify n&apos;a pas abouti — nouvelle tentative bientôt</Preview>
            <Body style={{ backgroundColor: '#0a0a0a', color: '#ededed', fontFamily: 'system-ui, -apple-system, sans-serif', padding: '24px' }}>
                <Container style={{ maxWidth: 540, margin: '0 auto', backgroundColor: '#0f0f0f', borderRadius: 16, padding: 32 }}>
                    <Heading as="h1" style={{ fontSize: 22, marginBottom: 8 }}>Paiement non abouti</Heading>
                    <Text>{greeting}</Text>
                    <Text>
                        Notre tentative de prélèvement pour votre abonnement Invoicify n&apos;a pas pu aboutir.
                        Raison communiquée par votre banque : <strong>{declineReason}</strong>.
                    </Text>
                    <Text>
                        Aucune action urgente n&apos;est requise — nous allons relancer automatiquement le{' '}
                        <strong>{new Date(nextRetryAt).toLocaleDateString('fr-MA')}</strong>.
                        Pour éviter toute interruption, vérifiez votre solde ou votre limite de paiement
                        quotidienne.
                    </Text>
                    <Section style={{ marginTop: 24 }}>
                        <Button
                            href={updateCardUrl}
                            style={{ backgroundColor: '#3B82F6', color: '#fff', padding: '12px 18px', borderRadius: 12, fontWeight: 600, textDecoration: 'none' }}
                        >
                            Mettre à jour ma carte
                        </Button>
                    </Section>
                    <Text style={{ fontSize: 12, color: '#888', marginTop: 24 }}>
                        Vous gardez votre accès Pro pendant 7 jours. Si la 3e tentative échoue, votre compte
                        bascule automatiquement en Gratuit (mais toutes vos données restent accessibles en
                        lecture seule).
                    </Text>
                </Container>
            </Body>
        </Html>
    )
}
