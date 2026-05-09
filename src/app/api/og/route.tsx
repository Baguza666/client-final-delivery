import { ImageResponse } from 'next/og'
import { daysUntilLaunch } from '@/lib/launch-date'

export const runtime = 'edge'
export const contentType = 'image/png'

export async function GET() {
    const days = daysUntilLaunch()
    return new ImageResponse(
        (
            <div
                style={{
                    height: '100%',
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    background: '#020617',
                    backgroundImage:
                        'radial-gradient(circle at 30% 20%, rgba(99,102,241,0.35) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(139,92,246,0.3) 0%, transparent 50%)',
                    color: 'white',
                    padding: '80px',
                    fontFamily: 'system-ui',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        background: 'rgba(99,102,241,0.15)',
                        border: '1px solid rgba(99,102,241,0.3)',
                        borderRadius: '999px',
                        padding: '8px 20px',
                        fontSize: '24px',
                        fontWeight: 700,
                        color: '#A5B4FC',
                        marginBottom: '40px',
                    }}
                >
                    🇲🇦 Invoicify · Lancement dans {days} jours
                </div>

                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        textAlign: 'center',
                        fontSize: '88px',
                        fontWeight: 800,
                        lineHeight: 1.05,
                        letterSpacing: '-0.02em',
                    }}
                >
                    <span>Bloquez votre tarif fondateur.</span>
                    <span
                        style={{
                            background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                            backgroundClip: 'text',
                            color: 'transparent',
                            fontStyle: 'italic',
                        }}
                    >
                        À vie.
                    </span>
                </div>

                <div
                    style={{
                        display: 'flex',
                        marginTop: '48px',
                        fontSize: '28px',
                        color: 'rgba(255,255,255,0.5)',
                        fontWeight: 500,
                    }}
                >
                    Devis · BC · BL · Factures conformes ICE/IF/RC/CNSS
                </div>
            </div>
        ),
        {
            width: 1200,
            height: 630,
        },
    )
}
