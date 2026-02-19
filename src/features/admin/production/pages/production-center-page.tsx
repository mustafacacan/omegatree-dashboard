import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import {
  Card, CardContent,
  Button, Input, Badge,
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
  Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter,
} from '@/components/ui'
import { StatCard } from '@/components/shared/stat-card'
import { TablePagination } from '@/components/shared/table-pagination'
import { formatDate } from '@/lib/utils'
import { Factory, Barcode, Printer, Package, Plus, Copy, Check, Link2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useWorkflowStore } from '@/stores/workflow.store'
import { KitStatus } from '@/utils/constants'

export function ProductionCenterPage() {
  const { kits, generateBarcodes, markKitPrinted, markKitsPrinted, assignBarcodeToKit } = useWorkflowStore()
  const [generateOpen, setGenerateOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [quantity, setQuantity] = useState('10')
  const [prefix, setPrefix] = useState('OT')
  const [targetBarcode, setTargetBarcode] = useState<string | null>(null)
  const [kitIdInput, setKitIdInput] = useState('')
  const [kitNameInput, setKitNameInput] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [printFilter, setPrintFilter] = useState<'all' | 'printed' | 'pending'>('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const recentBarcodes = useMemo(
    () =>
      kits.slice(0, 50).map((k) => ({
        id: k.barcode,
        barcode: k.barcode,
        batch: k.batch,
        createdAt: k.createdAt,
        printed: k.printed,
        linkedKit: k.linkedKit,
      })),
    [kits]
  )

  const filteredBarcodes = useMemo(() => {
    return recentBarcodes.filter((item) => {
      const q = searchQuery.toLowerCase()
      const matchesSearch = !q || item.barcode.toLowerCase().includes(q) || item.batch.toLowerCase().includes(q)
      const matchesPrint =
        printFilter === 'all' ||
        (printFilter === 'printed' && item.printed) ||
        (printFilter === 'pending' && !item.printed)
      return matchesSearch && matchesPrint
    })
  }, [recentBarcodes, searchQuery, printFilter])

  const paginatedBarcodes = useMemo(
    () => filteredBarcodes.slice((page - 1) * pageSize, page * pageSize),
    [filteredBarcodes, page, pageSize]
  )
  const pendingInView = paginatedBarcodes.filter((item) => !item.printed)
  const allVisibleSelected =
    pendingInView.length > 0 && pendingInView.every((item) => selectedIds.includes(item.id))
  const previewQty = Number.isFinite(Number(quantity)) ? Math.max(0, Number(quantity)) : 0
  const previewPrefix = (prefix.trim().toUpperCase() || 'OT')

  useEffect(() => {
    const validIds = new Set(filteredBarcodes.map((item) => item.id))
    setSelectedIds((prev) => {
      const next = prev.filter((id) => validIds.has(id))
      if (next.length === prev.length && next.every((id, idx) => id === prev[idx])) {
        return prev
      }
      return next
    })
  }, [filteredBarcodes])

  useEffect(() => {
    setPage(1)
  }, [searchQuery, printFilter])

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredBarcodes.length / pageSize))
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [filteredBarcodes.length, page, pageSize])

  const handleCopy = async (barcode: string, id: string) => {
    try {
      await navigator.clipboard.writeText(barcode)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
      toast.success('Barkod kopyalandi')
    } catch {
      toast.error('Kopyalama basarisiz oldu')
    }
  }

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]))
  }

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pendingInView.some((item) => item.id === id)))
      return
    }
    setSelectedIds((prev) => {
      const next = new Set(prev)
      pendingInView.forEach((item) => next.add(item.id))
      return Array.from(next)
    })
  }

  const validateGenerateInput = () => {
    const n = Number(quantity)
    if (!Number.isInteger(n) || n <= 0) return 'Adet pozitif bir tam sayi olmali.'
    if (n > 500) return 'Maksimum 500 adet uretebilirsiniz.'
    const normalizedPrefix = prefix.trim().toUpperCase()
    if (!normalizedPrefix) return 'On ek (prefix) zorunludur.'
    if (!/^[A-Z0-9]{2,8}$/.test(normalizedPrefix)) {
      return 'Prefix 2-8 karakter olmali ve sadece harf/rakam icermeli.'
    }
    return null
  }

  const handleGenerate = () => {
    const validationError = validateGenerateInput()
    if (validationError) {
      toast.error(validationError)
      return
    }

    const n = Number(quantity)
    const normalizedPrefix = prefix.trim().toUpperCase()
    generateBarcodes(n, normalizedPrefix, 'Admin')
    setGenerateOpen(false)
    setQuantity('10')
    setPrefix(normalizedPrefix)
    toast.success(`${n} adet barkod uretildi`)
  }

  const handlePrintSingle = (barcode: string) => {
    const result = markKitPrinted(barcode, 'Admin')
    if (result.ok) toast.success(result.message)
    else toast.error(result.message)
  }

  const handlePrintBulk = () => {
    const targets = selectedIds.length > 0 ? selectedIds : pendingInView.map((item) => item.id)
    const result = markKitsPrinted(targets, 'Admin')
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    toast.success(result.message)
    setSelectedIds([])
  }

  const openAssignModal = (barcode: string) => {
    const selected = recentBarcodes.find((b) => b.barcode === barcode)
    setTargetBarcode(barcode)
    setKitIdInput(selected?.linkedKit?.kitId || '')
    setKitNameInput(selected?.linkedKit?.kitName || '')
    setAssignOpen(true)
  }

  const handleAssignBarcode = () => {
    if (!targetBarcode) return
    const result = assignBarcodeToKit(targetBarcode, kitIdInput, kitNameInput, 'Admin')
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    toast.success(result.message)
    setAssignOpen(false)
    setTargetBarcode(null)
    setKitIdInput('')
    setKitNameInput('')
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        <StatCard title="Toplam Uretilen" value={String(kits.length)} icon={Barcode} color="primary" />
        <StatCard title="Basim Bekleyen" value={String(kits.filter((k) => !k.printed).length)} icon={Printer} color="amber" />
        <StatCard title="Stokta" value={String(kits.filter((k) => k.status === KitStatus.IN_STOCK).length)} icon={Package} color="sky" />
        <StatCard title="Bu Ay Uretilen" value={String(kits.filter((k) => new Date(k.createdAt).getMonth() === new Date().getMonth()).length)} icon={Factory} color="violet" />
        <StatCard title="Kite Atanan" value={String(kits.filter((k) => Boolean(k.linkedKit)).length)} icon={Link2} color="primary" />
      </div>

      <Card>
        <div className="p-5 pb-4 flex flex-wrap items-center justify-between gap-3 border-b border-surface-100">
          <div>
            <h3 className="text-[15px] font-semibold text-surface-900">Son Uretilen Barkodlar</h3>
            <p className="text-[13px] text-surface-500 mt-0.5">Uretim sirasina gore son barkodlar</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Input
              placeholder="Barkod veya parti ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-52"
            />
            <select
              value={printFilter}
              onChange={(e) => setPrintFilter(e.target.value as 'all' | 'printed' | 'pending')}
              className="h-10 rounded-lg border border-surface-200 bg-white px-3 text-sm text-surface-700 outline-none"
            >
              <option value="all">Tum Basimlar</option>
              <option value="pending">Basim Bekleyen</option>
              <option value="printed">Basilanlar</option>
            </select>
            <Button variant="outline" size="sm" onClick={handlePrintBulk} disabled={pendingInView.length === 0}>
              <Printer className="h-4 w-4" />
              {selectedIds.length > 0 ? `Seciliyi Yazdir (${selectedIds.length})` : 'Toplu Yazdir'}
            </Button>
            <Button variant="primary" size="sm" onClick={() => setGenerateOpen(true)}>
              <Plus className="h-4 w-4" />
              Barkod Uret
            </Button>
          </div>
        </div>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAllVisible}
                    disabled={pendingInView.length === 0}
                    className="h-4 w-4 rounded border-surface-300"
                  />
                </TableHead>
                <TableHead>Barkod</TableHead>
                <TableHead>Parti No</TableHead>
                <TableHead>Uretim Tarihi</TableHead>
                <TableHead>Basim</TableHead>
                <TableHead>Atanan Kit</TableHead>
                <TableHead className="w-24">Islemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBarcodes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-surface-500">
                    Filtreye uygun barkod bulunamadi.
                  </TableCell>
                </TableRow>
              )}
              {paginatedBarcodes.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(item.id)}
                      onChange={() => toggleSelection(item.id)}
                      disabled={item.printed}
                      className="h-4 w-4 rounded border-surface-300"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono font-semibold text-surface-800 bg-surface-50 px-2 py-1 rounded-lg">
                        {item.barcode}
                      </code>
                      <button
                        onClick={() => handleCopy(item.barcode, item.id)}
                        className="p-1 rounded hover:bg-surface-100 transition-colors"
                      >
                        {copiedId === item.id ? (
                          <Check className="h-3.5 w-3.5 text-primary-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5 text-surface-400" />
                        )}
                      </button>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-surface-500">{item.batch}</TableCell>
                  <TableCell className="text-sm text-surface-500">{formatDate(item.createdAt)}</TableCell>
                  <TableCell>
                    <Badge variant={item.printed ? 'success' : 'warning'} dot>
                      {item.printed ? 'Basildi' : 'Bekliyor'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {item.linkedKit ? (
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-surface-800">{item.linkedKit.kitName}</span>
                        <code className="text-[10px] text-surface-500">{item.linkedKit.kitId}</code>
                      </div>
                    ) : (
                      <Badge variant="outline">Atanmadi</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={item.printed}
                        onClick={() => handlePrintSingle(item.barcode)}
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openAssignModal(item.barcode)}
                      >
                        <Link2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            totalItems={filteredBarcodes.length}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(next) => {
              setPageSize(next)
              setPage(1)
            }}
          />
        </CardContent>
      </Card>

      {/* Generate Modal */}
      <Modal open={generateOpen} onOpenChange={setGenerateOpen}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Yeni Barkod Uret</ModalTitle>
            <ModalDescription>
              Belirtilen sayida benzersiz barkod olusturulacaktir
            </ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-4">
            <Input
              label="Adet"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Uretilecek barkod sayisi"
              hint="Maksimum 500 adet"
            />
            <Input
              label="On Ek (Prefix)"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value.toUpperCase())}
              placeholder="OT"
              hint="Barkod baslangic kodu (orn: OT-2025-XXXXX)"
            />
            <div className="p-3 rounded-lg bg-surface-50 border border-surface-200">
              <p className="text-xs text-surface-500">Onizleme:</p>
              <p className="text-sm font-mono font-medium text-surface-700 mt-1">
                {previewPrefix}-{new Date().getFullYear()}-00148 ... {previewPrefix}-{new Date().getFullYear()}-{String(147 + previewQty).padStart(5, '0')}
              </p>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setGenerateOpen(false)}>
              Iptal
            </Button>
            <Button
              variant="gradient"
              onClick={() => {
                handleGenerate()
              }}
            >
              <Barcode className="h-4 w-4" />
              {quantity} Adet Uret
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Assign Barcode To Kit Modal */}
      <Modal open={assignOpen} onOpenChange={setAssignOpen}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Barkodu Kite Ata</ModalTitle>
            <ModalDescription>
              Barkodu sisteme girilen kit ile eslestirin
            </ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-4">
            <Input label="Barkod" value={targetBarcode || ''} disabled />
            <Input
              label="Kit ID / Seri No"
              value={kitIdInput}
              onChange={(e) => setKitIdInput(e.target.value.toUpperCase())}
              placeholder="ORN: KIT-2025-001"
            />
            <Input
              label="Kit Adi"
              value={kitNameInput}
              onChange={(e) => setKitNameInput(e.target.value)}
              placeholder="ORN: Standart Omega-3 Kiti"
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>
              Iptal
            </Button>
            <Button variant="primary" onClick={handleAssignBarcode}>
              <Link2 className="h-4 w-4" />
              Kite Ata
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}
