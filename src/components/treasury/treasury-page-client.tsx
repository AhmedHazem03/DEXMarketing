'use client'

import { useState } from 'react'
import { useLocale } from 'next-intl'
import { Banknote } from 'lucide-react'
import { TreasuryStats, TransactionForm, TransactionsTable } from '@/components/treasury'
import { AddClientTransactionDialog } from '@/components/treasury/add-client-transaction-dialog'
import { PageHeader } from '@/components/admin/page-header'
import { useTreasuryRealtimeSync } from '@/hooks/use-realtime'
import { Button } from '@/components/ui/button'

export function TreasuryPageClient() {
    const locale = useLocale()
    const isAr = locale === 'ar'
    const [treasuryTransactionOpen, setTreasuryTransactionOpen] = useState(false)

    // Subscribe to real-time transaction changes so balance updates automatically
    useTreasuryRealtimeSync()

    return (
        <div className="space-y-6">
            <PageHeader
                title={isAr ? 'الإدارة المالية' : 'Financial Management'}
                description={isAr ? 'متابعة حركة الخزينة والمصروفات والإيرادات' : 'Track treasury movements, income and expenses'}
                actions={
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setTreasuryTransactionOpen(true)}
                        >
                            <Banknote className="me-2 h-4 w-4" />
                            {isAr ? 'معاملة خزنة' : 'Treasury Transaction'}
                        </Button>
                        <TransactionForm />
                    </div>
                }
            />
            <AddClientTransactionDialog
                open={treasuryTransactionOpen}
                onOpenChange={setTreasuryTransactionOpen}
                mode="treasury"
            />

            {/* Stats Cards */}
            <TreasuryStats />

            {/* Transactions Table */}
            <TransactionsTable />
        </div>
    )
}
