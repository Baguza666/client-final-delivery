import { Body, Container, Heading, Html, Text, Preview } from '@react-email/components'

interface Props {
    firstName?: string | null
    refundAmount: number
    factureNumber?: string | null
}

export default function RefundProcessed({ firstName, refundAmount, factureNumber }: Props) {
    const greeting = firstName ? `Bonjour ${firstName},` : 'Bonjour,'
    return (
        <Html lang="fr">
            <Preview>Votre remboursement Invoicify a été traité</Preview>
            <Body style={{ backgroundColor: '#0a0a0a', color: '#ededed', fontFamily: 'system-ui, -apple-system, sans-serif', padding: '24px' }}>
                <Container style={{ maxWidth: 540, margin: '0 auto', backgroundColor: '#0f0f0f', borderRadius: 16, padding: 32 }}>
                    <Heading as="h1" style={{ fontSize: 22, marginBottom: 8 }}>Remboursement traité</Heading>
                    <Text>{greeting}</Text>
                    <Text>
                        Votre remboursement de <strong>{refundAmount.toFixed(2)} MAD</strong> a été initié.
                        Le délai de réception dépend de votre banque (3 à 7 jours ouvrés).
                    </Text>
                    {factureNumber && (
                        <Text>
                            Facture associée : <code>{factureNumber}</code>. Une facture d&apos;avoir
                            apparaîtra prochainement dans <code>/billing</code> pour votre comptabilité.
                        </Text>
                    )}
                    <Text style={{ fontSize: 12, color: '#888', marginTop: 24 }}>
                        Merci d&apos;avoir essayé Invoicify.
                    </Text>
                </Container>
            </Body>
        </Html>
    )
}
