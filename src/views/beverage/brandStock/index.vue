<template>
  <div class="app-container bp">
    <!-- ============ 视图一：品牌列表 ============ -->
    <div v-if="view === 'brand'">
      <el-card shadow="never" class="bp-toolbar">
        <div class="bp-toolbar__row">
          <el-input
            v-model="brandKeyword"
            placeholder="搜索品牌"
            clearable
            style="width: 220px"
          >
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>
          <el-checkbox v-model="onlyWithProduct" class="bp-toolbar__chk">只看有商品的品牌</el-checkbox>
          <div class="bp-toolbar__right">
            <el-button icon="Refresh" @click="loadBrands">刷新</el-button>
          </div>
        </div>
        <div class="bp-tip">
          按品牌管理库存：点击品牌卡片进入库存表，可查看每款商品的批次存量与临期状态，并按批次调整库存（批次号、保质期至必填，总库存随批次自动联动）。品牌在「系统管理 → 字典管理 → 饮料品牌」中维护。本功能仅超管可用。
        </div>
      </el-card>

      <div v-loading="brandLoading" class="bp-grid">
        <div
          v-for="b in filteredBrands"
          :key="b.brand"
          class="bp-card"
          @click="openBrand(b)"
        >
          <div class="bp-card__head">
            <span class="bp-card__dot" :style="{ background: brandColor(b.brand) }"></span>
            <span class="bp-card__name" :title="b.brand">{{ b.brand }}</span>
            <span class="bp-card__count">{{ b.productCount }} 款</span>
          </div>
          <div class="bp-card__body">
            <div class="bp-card__line">
              <span class="bp-label">总库存</span>
              <span v-if="b.productCount" class="bp-value">{{ Number(b.totalStock) || 0 }} 件</span>
              <span v-else class="bp-value bp-value--empty">暂无商品</span>
            </div>
            <div class="bp-card__line">
              <span class="bp-label">低库存</span>
              <span v-if="b.productCount" :class="['bp-value', Number(b.lowStockCount) > 0 ? 'bp-value--danger' : 'bp-value--good']">
                {{ Number(b.lowStockCount) || 0 }} 款预警
              </span>
              <span v-else class="bp-value bp-value--empty">—</span>
            </div>
            <div class="bp-card__line">
              <span class="bp-label">在售</span>
              <span v-if="b.productCount" class="bp-value">{{ b.onSaleCount }} / {{ b.productCount }}</span>
              <span v-else class="bp-value bp-value--empty">—</span>
            </div>
          </div>
          <div class="bp-card__foot">
            <span class="bp-card__onsale">库存预警 {{ b.lowStockCount || 0 }}</span>
            <span class="bp-card__enter">进入批次库存 <el-icon><ArrowRight /></el-icon></span>
          </div>
        </div>

        <div v-if="!brandLoading && filteredBrands.length === 0" class="bp-empty">
          <el-empty description="没有匹配的品牌" />
        </div>
      </div>
    </div>

    <!-- ============ 视图二：某品牌的批次库存管理 ============ -->
    <div v-else>
      <el-card shadow="never" class="bp-toolbar">
        <div class="bp-toolbar__row">
          <el-button icon="ArrowLeft" @click="backToBrands">品牌列表</el-button>
          <span class="bp-crumb">
            <span class="bp-crumb__dot" :style="{ background: brandColor(currentBrand) }"></span>
            {{ currentBrand }}
            <el-tag size="small" type="info">{{ rows.length }} 款商品</el-tag>
          </span>
          <div class="bp-toolbar__right">
            <el-checkbox v-model="onlyOnSale" class="bp-toolbar__chk">只看在售</el-checkbox>
            <el-checkbox v-model="onlyLow" class="bp-toolbar__chk">只看预警</el-checkbox>
            <el-button icon="Refresh" @click="loadProducts">刷新</el-button>
          </div>
        </div>
      </el-card>

      <el-table
        v-loading="tableLoading"
        :data="viewRows"
        border
      >
        <el-table-column label="商品" min-width="190">
          <template #default="scope">
            <div class="bp-pname">{{ scope.row.productName }}</div>
            <div class="bp-pspec">{{ scope.row.spec }} · {{ scope.row.barcode || '无条码' }}</div>
          </template>
        </el-table-column>
        <el-table-column label="单位" prop="unit" width="70" align="center" />
        <el-table-column label="总库存" width="90" align="center">
          <template #default="scope">
            <span :class="isLow(scope.row) ? 'bp-value--danger' : ''" style="font-weight:600">{{ scope.row.stock }}</span>
          </template>
        </el-table-column>
        <el-table-column label="批次数" width="80" align="center">
          <template #default="scope">
            <span v-if="scope.row.batchCount">{{ scope.row.batchCount }}</span>
            <span v-else class="bp-muted">未建档</span>
          </template>
        </el-table-column>
        <el-table-column label="批次合计" width="90" align="center">
          <template #default="scope">
            <span v-if="scope.row.batchCount">{{ scope.row.batchQtySum }}</span>
            <span v-else class="bp-muted">—</span>
          </template>
        </el-table-column>
        <el-table-column label="临期/过期批次" width="120" align="center">
          <template #default="scope">
            <template v-if="scope.row.batchCount">
              <el-tag v-if="scope.row.expiredCount > 0" type="danger" size="small" style="margin-right:4px">过期 {{ scope.row.expiredCount }}</el-tag>
              <el-tag v-if="scope.row.nearCount > 0" type="warning" size="small">临期 {{ scope.row.nearCount }}</el-tag>
              <span v-if="!scope.row.expiredCount && !scope.row.nearCount" class="bp-muted">正常</span>
            </template>
            <span v-else class="bp-muted">—</span>
          </template>
        </el-table-column>
        <el-table-column label="最早到期" width="100" align="center">
          <template #default="scope">
            <span v-if="scope.row.earliestExpiry">{{ scope.row.earliestExpiry }}</span>
            <span v-else class="bp-muted">—</span>
          </template>
        </el-table-column>
        <el-table-column label="预警阈值" width="80" align="center">
          <template #default="scope">{{ scope.row.warnStock || 0 }}</template>
        </el-table-column>
        <el-table-column label="状态" width="80" align="center">
          <template #default="scope">
            <el-tag :type="scope.row.status === '0' ? 'success' : 'info'" size="small">
              {{ scope.row.status === '0' ? '在售' : '下架' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="110" align="center" fixed="right">
          <template #default="scope">
            <el-button
              link type="success" icon="Box"
              :disabled="!hasStockPerm"
              @click="openAdjust(scope.row)"
              v-hasPermi="['beverage:product:stock']"
            >批次调整</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div v-if="!tableLoading && viewRows.length === 0" class="bp-empty">
        <el-empty :description="currentBrand + ' 下暂无商品'" />
      </div>
    </div>

    <!-- 批次调整库存（共享组件：批次号/保质期必填，总量联动） -->
    <BatchStockDialog ref="batchStockRef" @saved="onSaved" />
  </div>
</template>

<script setup name="BeverageBrandStock">
import { listBrandStats, listBrandProducts } from "@/api/beverage/product"
import { listBatch } from "@/api/beverage/batch"
import BatchStockDialog from "../components/BatchStockDialog.vue"
import { useDict } from "@/utils/dict"
import useUserStore from "@/store/modules/user"

const { proxy } = getCurrentInstance()
const route = useRoute()

// 品牌字典（含尚未录入商品的品牌）
const { beverage_brand } = useDict('beverage_brand')
// 是否可调整库存：仅超管（*:*:* 或 beverage:product:stock）
const hasStockPerm = computed(() => {
  const perms = useUserStore().permissions || []
  return perms.some(p => p === '*:*:*' || p === 'beverage:product:stock')
})

/* ---------------- 品牌列表 ---------------- */
const view = ref('brand')            // 'brand' | 'stock'
const brandLoading = ref(false)
const tableLoading = ref(false)
const statsList = ref([])            // 后端统计（有商品的品牌）
const brandKeyword = ref('')
const onlyWithProduct = ref(true)

const brandPalette = ['#409EFF', '#67C23A', '#E6A23C', '#F56C6C', '#909399', '#9254DE', '#13C2C2', '#EB2F96']
function brandColor(name) {
  if (!name) return '#909399'
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return brandPalette[h % brandPalette.length]
}
function isLow(p) {
  return p && Number(p.warnStock) > 0 && Number(p.stock) <= Number(p.warnStock)
}

const allBrands = computed(() => {
  const map = {}
  statsList.value.forEach(s => { map[s.brand] = { ...s } })
  ;(beverage_brand.value || []).forEach(o => {
    if (!map[o.value]) {
      map[o.value] = {
        brand: o.value,
        productCount: 0,
        onSaleCount: 0,
        totalStock: 0,
        lowStockCount: 0
      }
    }
  })
  return Object.keys(map).sort().map(k => map[k])
})

const filteredBrands = computed(() => {
  const k = (brandKeyword.value || '').trim().toLowerCase()
  return allBrands.value.filter(b => {
    if (onlyWithProduct.value && !b.productCount) return false
    if (k && !(b.brand || '').toLowerCase().includes(k)) return false
    return true
  })
})

function loadBrands() {
  brandLoading.value = true
  listBrandStats().then(res => {
    statsList.value = res.data || []
    brandLoading.value = false
  }).catch(() => { brandLoading.value = false })
}

/* ---------------- 品牌批次库存表 ---------------- */
const currentBrand = ref('')
const rows = ref([])
const onlyOnSale = ref(false)
const onlyLow = ref(false)

const viewRows = computed(() => {
  return rows.value.filter(r => {
    if (onlyOnSale.value && r.status !== '0') return false
    if (onlyLow.value && !isLow(r)) return false
    return true
  })
})

function openBrand(b) {
  currentBrand.value = b.brand
  view.value = 'stock'
  loadProducts()
}
function backToBrands() {
  view.value = 'brand'
  currentBrand.value = ''
  rows.value = []
  loadBrands()
}

function loadProducts() {
  if (!currentBrand.value) return
  tableLoading.value = true
  Promise.all([
    listBrandProducts(currentBrand.value),
    listBatch({ brand: currentBrand.value })
  ]).then(([pRes, bRes]) => {
    const products = (pRes.data || []).map(p => ({ ...p, stock: Number(p.stock) || 0 }))
    // 按商品聚合批次统计
    const byProduct = {}
    ;(bRes.data || bRes.rows || []).forEach(b => {
      const pid = b.productId
      if (!byProduct[pid]) byProduct[pid] = { count: 0, qtySum: 0, near: 0, expired: 0, earliest: null }
      const agg = byProduct[pid]
      if (Number(b.qty) > 0) {
        agg.count += 1
        agg.qtySum += Number(b.qty) || 0
        if (b.expiryStatus === 'expired') agg.expired += 1
        else if (b.expiryStatus === 'near') agg.near += 1
        if (b.expiryDate) {
          const d = String(b.expiryDate).slice(0, 10)
          if (!agg.earliest || d < agg.earliest) agg.earliest = d
        }
      }
    })
    rows.value = products.map(p => {
      const agg = byProduct[p.productId]
      return {
        ...p,
        batchCount: agg ? agg.count : 0,
        batchQtySum: agg ? agg.qtySum : 0,
        nearCount: agg ? agg.near : 0,
        expiredCount: agg ? agg.expired : 0,
        earliestExpiry: agg ? agg.earliest : null
      }
    })
    tableLoading.value = false
  }).catch(() => { tableLoading.value = false })
}

/* ---------------- 批次调整 ---------------- */
const batchStockRef = ref(null)
function openAdjust(row) {
  batchStockRef.value.open(row.productId)
}
function onSaved() {
  loadProducts()
  loadBrands()
}

onMounted(() => {
  loadBrands()
  const b = route.query.brand
  if (b) {
    currentBrand.value = String(b)
    view.value = 'stock'
    loadProducts()
  }
})
</script>

<style scoped lang="scss">
.bp {
  .bp-toolbar { margin-bottom: 16px; }
  .bp-toolbar__row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .bp-toolbar__right { margin-left: auto; display: flex; align-items: center; gap: 8px; }
  .bp-toolbar__chk { margin-left: 4px; }
  .bp-tip { margin-top: 10px; font-size: 12px; color: var(--el-text-color-secondary); line-height: 1.6; }

  .bp-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 16px;
    min-height: 200px;
    align-content: start;
  }
  .bp-card {
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 10px;
    padding: 14px 16px 10px;
    cursor: pointer;
    transition: transform 0.18s, box-shadow 0.18s;
    &:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12); border-color: var(--el-color-primary-light-5); }
    &__head { display: flex; align-items: center; gap: 8px; }
    &__dot { width: 10px; height: 10px; border-radius: 50%; flex: none; }
    &__name { font-size: 15px; font-weight: 600; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    &__count { font-size: 12px; color: var(--el-text-color-secondary); }
    &__body { margin-top: 12px; }
    &__line { display: flex; align-items: center; font-size: 13px; line-height: 26px; }
    &__foot {
      margin-top: 10px; padding-top: 8px; border-top: 1px dashed var(--el-border-color-lighter);
      display: flex; align-items: center; justify-content: space-between; font-size: 12px;
    }
    &__onsale { color: var(--el-text-color-secondary); }
    &__enter { color: var(--el-color-primary); display: inline-flex; align-items: center; gap: 2px; }
  }
  .bp-label { width: 60px; color: var(--el-text-color-secondary); flex: none; }
  .bp-value { color: var(--el-text-color-primary); }
  .bp-value--empty { color: var(--el-text-color-placeholder); }
  .bp-value--good { color: var(--el-color-success); font-weight: 600; }
  .bp-value--danger { color: var(--el-color-danger); font-weight: 600; }
  .bp-muted { color: var(--el-text-color-placeholder); }

  .bp-crumb { display: inline-flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 600; }
  .bp-crumb__dot { width: 10px; height: 10px; border-radius: 50%; }

  .bp-pname { font-size: 13px; font-weight: 600; }
  .bp-pspec { font-size: 12px; color: var(--el-text-color-secondary); margin-top: 2px; }

  .bp-empty { padding: 40px 0; }
}
</style>
