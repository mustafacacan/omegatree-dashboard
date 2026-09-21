/** Besin tüketim sıklığı formu — ana besin grupları (müşteri brief). */

export type FfqFoodKey =
  | 'red_meat'
  | 'chicken'
  | 'fish'
  | 'eggs'
  | 'processed_meat'
  | 'legumes'
  | 'nuts'
  | 'milk'
  | 'yogurt'
  | 'cheese_salted'
  | 'cheese_unsalted'
  | 'leafy_greens'
  | 'root_vegetables'
  | 'seasonal_fruits'
  | 'white_bread'
  | 'whole_grain_bread'
  | 'rice'
  | 'bulgur'
  | 'pasta'
  | 'bakery_snacks'
  | 'sugar'
  | 'sweets_spreads'
  | 'pastry_sweets'
  | 'milk_desserts'
  | 'olive_oil'
  | 'sunflower_oil'
  | 'corn_oil'
  | 'butter'
  | 'margarine'
  | 'animal_fat'
  | 'packaged_salty'
  | 'packaged_sweet'
  | 'sauces'
  | 'olives'
  | 'fruit_juice'
  | 'soda'
  | 'mineral_water'
  | 'tea'
  | 'herbal_tea'
  | 'instant_coffee'
  | 'turkish_coffee'
  | 'filter_coffee'
  | 'beer'
  | 'wine'
  | 'raki'
  | 'spirits'
  | 'lahmacun'
  | 'cheese_pide'
  | 'pizza'
  | 'noodle'
  | 'doner'
  | 'kebab'
  | 'hamburger'
  | 'fried_foods'

export type FfqFoodGroup = {
  title: string
  items: Array<{ key: FfqFoodKey; label: string }>
}

export const FFQ_FOOD_GROUPS: FfqFoodGroup[] = [
  {
    title: 'Et, yumurta, kurubaklagil',
    items: [
      { key: 'red_meat', label: 'Kırmızı et' },
      { key: 'chicken', label: 'Tavuk eti' },
      { key: 'fish', label: 'Balık' },
      { key: 'eggs', label: 'Yumurta' },
      { key: 'processed_meat', label: 'Sucuk / salam / sosis / pastırma' },
      { key: 'legumes', label: 'Kurubaklagil' },
      { key: 'nuts', label: 'Sert kabuklu meyveler (fındık, fıstık, kaju, ceviz, badem)' },
    ],
  },
  {
    title: 'Süt ve süt ürünleri',
    items: [
      { key: 'milk', label: 'Süt' },
      { key: 'yogurt', label: 'Yoğurt' },
      { key: 'cheese_salted', label: 'Peynir türevleri (tuzlu)' },
      { key: 'cheese_unsalted', label: 'Peynir türevleri (tuzsuz)' },
    ],
  },
  {
    title: 'Taze sebze–meyve',
    items: [
      { key: 'leafy_greens', label: 'Yeşil yapraklı sebzeler (ıspanak, pazı, semiz otu vb.)' },
      { key: 'root_vegetables', label: 'Kök sebzeler (patates, enginar, kereviz vb.)' },
      { key: 'seasonal_fruits', label: 'Mevsim meyveleri' },
    ],
  },
  {
    title: 'Ekmek ve tahıllar',
    items: [
      { key: 'white_bread', label: 'Beyaz ekmek' },
      { key: 'whole_grain_bread', label: 'Tam tahıl ekmekleri' },
      { key: 'rice', label: 'Pirinç' },
      { key: 'bulgur', label: 'Bulgur' },
      { key: 'pasta', label: 'Makarna' },
      { key: 'bakery_snacks', label: 'Bisküvi / kraker / simit / kahvaltılık tahıl' },
    ],
  },
  {
    title: 'Yağ ve şeker',
    items: [
      { key: 'sugar', label: 'Çay şekeri (küp şeker)' },
      { key: 'sweets_spreads', label: 'Bal / reçel / pekmez / çikolata' },
      { key: 'pastry_sweets', label: 'Hamur tatlıları' },
      { key: 'milk_desserts', label: 'Sütlü tatlılar' },
      { key: 'olive_oil', label: 'Zeytinyağı' },
      { key: 'sunflower_oil', label: 'Ayçiçek yağı' },
      { key: 'corn_oil', label: 'Mısırözü yağı' },
      { key: 'butter', label: 'Tereyağı' },
      { key: 'margarine', label: 'Margarin' },
      { key: 'animal_fat', label: 'Kuyruk yağı / iç yağı' },
    ],
  },
  {
    title: 'Paketli gıdalar',
    items: [
      { key: 'packaged_salty', label: 'Paketli gıdalar (tuzlu)' },
      { key: 'packaged_sweet', label: 'Paketli gıdalar (şekerli)' },
      { key: 'sauces', label: 'Ketçap / mayonez / soslar' },
      { key: 'olives', label: 'Zeytin' },
    ],
  },
  {
    title: 'İçecekler',
    items: [
      { key: 'fruit_juice', label: 'Hazır meyve suyu' },
      { key: 'soda', label: 'Gazlı içecekler' },
      { key: 'mineral_water', label: 'Maden suları' },
      { key: 'tea', label: 'Çay' },
      { key: 'herbal_tea', label: 'Bitki çayları' },
      { key: 'instant_coffee', label: 'Hazır kahveler' },
      { key: 'turkish_coffee', label: 'Türk kahvesi' },
      { key: 'filter_coffee', label: 'Filtre kahve' },
      { key: 'beer', label: 'Bira' },
      { key: 'wine', label: 'Şarap' },
      { key: 'raki', label: 'Rakı' },
      { key: 'spirits', label: 'Viski, cin' },
    ],
  },
  {
    title: 'Diğerleri',
    items: [
      { key: 'lahmacun', label: 'Pide (etli) / lahmacun' },
      { key: 'cheese_pide', label: 'Pide (peynirli)' },
      { key: 'pizza', label: 'Pizza' },
      { key: 'noodle', label: 'Noodle' },
      { key: 'doner', label: 'Döner' },
      { key: 'kebab', label: 'Kebap' },
      { key: 'hamburger', label: 'Hamburger' },
      { key: 'fried_foods', label: 'Kızartma türevleri' },
    ],
  },
]

export const FFQ_FOOD_LABELS: Record<FfqFoodKey, string> = FFQ_FOOD_GROUPS.reduce(
  (acc, group) => {
    for (const item of group.items) acc[item.key] = item.label
    return acc
  },
  {} as Record<FfqFoodKey, string>,
)

export function labelFfqFood(key: string): string {
  return FFQ_FOOD_LABELS[key as FfqFoodKey] ?? key
}
