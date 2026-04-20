import type { EmailAccount, EmailSyncSnapshot } from '@/types'
import AccountRow from './AccountRow'

interface Props {
  accounts: EmailAccount[]
  allSnapshots: EmailSyncSnapshot[]
}

const COL_HEADERS = [
  { label: 'Inbox',       align: 'left'  },
  { label: 'Limit',       align: 'right' },
  { label: 'Sent',        align: 'right' },
  { label: 'Left',        align: 'right' },
  { label: 'Open%',       align: 'right' },
  { label: 'Click%',      align: 'right' },
  { label: 'Reply%',      align: 'right' },
  { label: 'Bounce%',     align: 'right' },
  { label: 'Unsub%',      align: 'right' },
  { label: 'Usage',       align: 'left'  },
  { label: 'Health',      align: 'left'  },
  { label: '',            align: 'left'  },
] as const

export default function AccountsTable({ accounts, allSnapshots }: Props) {
  if (accounts.length === 0) {
    return (
      <div className="bg-white dark:bg-[#1a1f2e] rounded-xl border border-slate-100 dark:border-white/10 p-6 text-center text-slate-500 dark:text-gray-500 text-sm">
        No email accounts yet. Add one using the Accounts settings.
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-[#1a1f2e] rounded-xl border border-slate-100 dark:border-white/10 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-gray-400">
              {COL_HEADERS.map((h, i) => (
                <th
                  key={i}
                  className={`px-4 py-3 font-medium ${h.align === 'right' ? 'text-right' : 'text-left'}`}
                >
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {accounts.map(account => (
              <AccountRow
                key={account.id}
                account={account}
                allSnapshots={allSnapshots}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
