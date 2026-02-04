import { createHash } from 'crypto'

export function generateHash(data: any): string {
    // Simple stable hash: sort keys and stringify
    const str = JSON.stringify(data, (key, value) => {
        // Sort object keys to ensure {a:1, b:2} hashes the same as {b:2, a:1}
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            return Object.keys(value)
                .sort()
                .reduce((sorted: any, key: string) => {
                    sorted[key] = value[key]
                    return sorted
                }, {})
        }
        return value
    })

    return createHash('md5').update(str).digest('hex')
}