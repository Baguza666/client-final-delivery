'use client';

import { useEffect } from 'react';

/**
 * Warns the user before unloading the page if `isDirty` is true.
 * Drop into edit forms — pass a derived "form changed since load" boolean.
 */
export function useUnsavedChanges(isDirty: boolean): void {
    useEffect(() => {
        if (!isDirty) return;
        const handler = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = '';
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [isDirty]);
}
