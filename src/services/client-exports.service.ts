import { downloadBlobFromApi } from '@/lib/download'

/** GET /clients/:clientId/exports/anamnez.xlsx */
export async function exportClientAnamnezXlsx(clientId: number | string): Promise<void> {
  await downloadBlobFromApi(
    `/clients/${clientId}/exports/anamnez.xlsx`,
    `anamnez-client-${clientId}.xlsx`,
  )
}

/** GET /clients/:clientId/exports/beslenme.xlsx */
export async function exportClientBeslenmeXlsx(clientId: number | string): Promise<void> {
  await downloadBlobFromApi(
    `/clients/${clientId}/exports/beslenme.xlsx`,
    `beslenme-client-${clientId}.xlsx`,
  )
}

/** GET /clients/:clientId/exports/lab.xlsx */
export async function exportClientLabXlsx(clientId: number | string): Promise<void> {
  await downloadBlobFromApi(
    `/clients/${clientId}/exports/lab.xlsx`,
    `lab-client-${clientId}.xlsx`,
  )
}

/** GET /clients/:clientId/exports/combined.xlsx — anamnez + tanita + lab */
export async function exportClientCombinedXlsx(clientId: number | string): Promise<void> {
  await downloadBlobFromApi(
    `/clients/${clientId}/exports/combined.xlsx`,
    `danisan-verileri-${clientId}.xlsx`,
  )
}
