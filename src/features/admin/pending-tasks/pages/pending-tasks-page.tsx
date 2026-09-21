import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/shared/page-header'
import { getAdminPendingTasks } from '@/services/support-tickets.service'
import { Link } from 'react-router-dom'
import { ROUTES } from '@/utils/routes'

function StatBlock({
  title,
  pending,
  inProgress,
  completed,
}: {
  title: string
  pending: number
  inProgress: number
  completed: number
}) {
  return (
    <div className="rounded-lg border border-surface-200 bg-panel p-4">
      <h3 className="font-semibold text-surface-900">{title}</h3>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
        <div>
          <dt className="text-surface-500">Bekleyen</dt>
          <dd className="text-lg font-semibold">{pending}</dd>
        </div>
        <div>
          <dt className="text-surface-500">İşlemde</dt>
          <dd className="text-lg font-semibold">{inProgress}</dd>
        </div>
        <div>
          <dt className="text-surface-500">Tamamlandı</dt>
          <dd className="text-lg font-semibold">{completed}</dd>
        </div>
      </dl>
    </div>
  )
}

export function PendingTasksPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-pending-tasks'],
    queryFn: getAdminPendingTasks,
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bekleyen İşler"
        description="Uzman, laboratuvar ve diyetisyen taraflarındaki bekleyen iş özetleri."
      />

      {isLoading && <p className="text-sm text-surface-500">Yükleniyor...</p>}
      {error && (
        <p className="text-sm text-danger-600">
          Bekleyen işler alınamadı. Lütfen tekrar deneyin.
        </p>
      )}

      {data && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <StatBlock
              title="Uzman"
              pending={data.summary.expert.pending}
              inProgress={data.summary.expert.inProgress}
              completed={data.summary.expert.completed}
            />
            <StatBlock
              title="Laboratuvar"
              pending={data.summary.laboratory.pending}
              inProgress={data.summary.laboratory.inProgress}
              completed={data.summary.laboratory.completed}
            />
            <StatBlock
              title="Diyetisyen"
              pending={data.summary.dietician.pending}
              inProgress={data.summary.dietician.inProgress}
              completed={data.summary.dietician.completed}
            />
          </div>

          <div className="rounded-lg border border-surface-200 bg-panel p-4">
            <p className="text-sm text-surface-600">
              Açık destek talepleri:{' '}
              <span className="font-semibold text-surface-900">
                {data.summary.supportTicketsOpen}
              </span>
            </p>
            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              <Link className="text-primary-600 hover:underline" to={ROUTES.YONETICI_UZMANLAR}>
                Uzmanlar
              </Link>
              <Link
                className="text-primary-600 hover:underline"
                to={ROUTES.YONETICI_LABORATUVARLAR}
              >
                Laboratuvarlar
              </Link>
              <Link
                className="text-primary-600 hover:underline"
                to={ROUTES.YONETICI_DIYETISYENLER}
              >
                Diyetisyenler
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
