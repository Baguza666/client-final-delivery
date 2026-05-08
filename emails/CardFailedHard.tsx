// Hard-decline email: card expired, not supported, stolen, or lost. Requires
// an actual card update from the customer; longer 14-day grace + 3 retries.

import { Body, Container, Heading, Html, Section, Text, Button, Preview } from '@react-email/components'

interface Props {
    firstName?: string | null
    declineReason: string
    finalDowngradeAt: string  // ISO date — when the workspace flips to Gratuit if no action
    updateCardUrl: string
}

export default function CardFailedHard({ firstName, declineReason, finalDowngradeAt, updateCardUrl }: Props) {
    const greeting = firstName ? `Bonjour ${firstName},` : 'Bonjour,'
    return (
        <Html lang="fr">
            <Preview>Action requise — votre carte Invoicify ne fonctionne plus</Preview>
            <Body style={{ backgroundColor: '#0a0a0a', color: '#ededed', fontFamily: 'system-ui, -apple-system, sans-serif', padding: '24px' }}>
                <Container style={{ maxWidth: 540, margin: '0 auto', backgroundColor: '#0f0f0f', borderRadius: 16, padding: 32 }}>
                    <Heading as="h1" style={{ fontSize: 22, marginBottom: 8 }}>Action requise — mise à jour de carte</Heading>
                    <Text>{greeting}</Text>
                    <Text>
                        Votre carte ne peut plus être utilisée pour Invoicify (raison : <strong>{declineReason}</strong>).
                    </Text>
                    <Text>
                        Vous gardez votre accès Pro jusqu&apos;au{' '}
                        <strong>{new Date(finalDowngradeAt).toLocaleDateString('fr-MA')}</strong>.
                        Sans mise à jour de carte d&apos;ici là, votre compte bascule en Gratuit
                        (vos données restent accessibles en lecture seule).
                    </Text>
                    <Section style={{ marginTop: 24 }}>
                        <Button
                            href={updateCardUrl}
                            style={{ backgroundColor: '#EF4444', color: '#fff', padding: '12px 18px', borderRadius: 12, fontWeight: 600, textDecoration: 'none' }}
                        >
                            Mettre à jour ma carte
                        </Button>
                    </Section>
                    <Text style={{ fontSize: 12, color: '#888', marginTop: 24 }}>
                        Une question ? Contactez-nous sur WhatsApp ou par email à support@invoicify.ma.
                    </Text>
                </Container>
            </Body>
        </Html>
    )
}
