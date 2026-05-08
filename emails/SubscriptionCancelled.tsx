import { Body, Container, Heading, Html, Text, Preview } from '@react-email/components'

interface Props {
    firstName?: string | null
    refunded: boolean
    accessUntil: string  // ISO date
    refundAmount?: number
}

export default function SubscriptionCancelled({ firstName, refunded, accessUntil, refundAmount }: Props) {
    const greeting = firstName ? `Bonjour ${firstName},` : 'Bonjour,'
    const accessDate = new Date(accessUntil).toLocaleDateString('fr-MA')
    return (
        <Html lang="fr">
            <Preview>Votre abonnement Invoicify a été annulé</Preview>
            <Body style={{ backgroundColor: '#0a0a0a', color: '#ededed', fontFamily: 'system-ui, -apple-system, sans-serif', padding: '24px' }}>
                <Container style={{ maxWidth: 540, margin: '0 auto', backgroundColor: '#0f0f0f', borderRadius: 16, padding: 32 }}>
                    <Heading as="h1" style={{ fontSize: 22, marginBottom: 8 }}>Annulation confirmée</Heading>
                    <Text>{greeting}</Text>
                    {refunded ? (
                        <Text>
                            Votre abonnement a été annulé et votre carte a été remboursée
                            {refundAmount ? <> de <strong>{refundAmount.toFixed(2)} MAD</strong></> : null}.
                            Le remboursement peut prendre 3 à 7 jours ouvrés selon votre banque.
                        </Text>
                    ) : (
                        <Text>
                            Votre abonnement a été annulé. Vous gardez votre accès Pro jusqu&apos;au{' '}
                            <strong>{accessDate}</strong>, puis votre compte bascule en Gratuit.
                            Vos données restent accessibles en lecture seule.
                        </Text>
                    )}
                    <Text>
                        Si vous changez d&apos;avis, vous pouvez réactiver votre abonnement à tout moment depuis
                        <code> /billing </code>. Votre code FOUNDER30 reste valide tant que la cohorte est ouverte.
                    </Text>
                    <Text style={{ fontSize: 12, color: '#888', marginTop: 24 }}>
                        Merci d&apos;avoir essayé Invoicify. N&apos;hésitez pas à nous dire ce qui n&apos;a pas marché —
                        votre retour nous aide à nous améliorer.
                    </Text>
                </Container>
            </Body>
        </Html>
    )
}
