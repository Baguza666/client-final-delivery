import { getRecurringTemplates } from '@/app/actions/invoices'
import RecurringManager from '@/components/invoices/RecurringManager'

export default async function RecurringInvoicesPage() {
    const templates = await getRecurringTemplates()
    return <RecurringManager initialTemplates={templates} />
}
