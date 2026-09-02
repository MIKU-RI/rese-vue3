<template>
  <div class="app-container bp">
    <!-- ============ 视图一：品牌列表（不直接展示商品） ============ -->
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
          按品牌统一管理进货价 / 销售价：点击品牌卡片进入该品牌的价格表，可单个修改或批量调价。品牌在「系统管理 → 字典管理 → 饮料品牌」中维护。
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
              <span class="bp-label">进货价</span>
              <span v-if="b.productCount" class="bp-value">¥{{ money(b.minPurchase) }} ~ ¥{{ money(b.maxPurchase) }}</span>
              <span v-else class="bp-value bp-value--empty">暂无商品</span>
            </div>
            <div class="bp-card__line">
              <span class="bp-label">销售价</span>
              <span v-if="b.productCount" class="bp-value">¥{{ money(b.minSale) }} ~ ¥{{ money(b.maxSale) }}</span>
              <span v-else class="bp-value bp-value--empty">—</span>
            </div>
            <div class="bp-card__line">
              <span class="bp-label">平均毛利</span>
              <span v-if="b.productCount" :class="['bp-value', Number(b.avgMargin) < 0 ? 'bp-value--danger' : 'bp-value--good']">
                {{ Number(b.avgMargin).toFixed(2) }}%
              </span>
              <span v-else class="bp-value bp-value--empty">—</span>
            </div>
          </div>
          <div class="bp-card__foot">
            <span class="bp-card__onsale">在售 {{ b.onSaleCount }} / {{ b.productCount }}</span>
            <span class="bp-card__enter">进入调价 <el-icon><ArrowRight /></el-icon></span>
          </div>
        </div>

        <div v-if="!brandLoading && filteredBrands.length === 0" class="bp-empty">
          <el-empty description="没有匹配的品牌" />
        </div>
      </div>
    </div>

    <!-- ============ 视图二：某品牌的价格管理 ============ -->
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
            <el-button icon="Refresh" @click="loadProducts">重置</el-button>
            <el-button type="warning" plain icon="EditPen" :disabled="!hasEditPerm" @click="openBatch">批量调价</el-button>
            <el-button type="primary" icon="Check" :disabled="!hasEditPerm" @click="submitPrice">保存</el-button>
          </div>
        </div>
      </el-card>

      <el-table
        v-loading="tableLoading"
        :data="viewRows"
        border
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="50" align="center" />
        <el-table-column label="商品" min-width="200">
          <template #default="scope">
            <div class="bp-pname">{{ scope.row.productName }}</div>
            <div class="bp-pspec">{{ scope.row.spec }} · {{ scope.row.barcode || '无条码' }}</div>
          </template>
        </el-table-column>
        <el-table-column label="单位" prop="unit" width="70" align="center" />
        <el-table-column label="进货价" width="150" align="center">
          <template #default="scope">
            <el-input-number
              v-model="scope.row.purchasePrice"
              :precision="2"
              :min="0"
              :step="1"
              :controls-position="'right'"
              :disabled="!hasEditPerm"
              style="width: 100%"
              @change="markDirty(scope.row)"
            />
          </template>
        </el-table-column>
        <el-table-column label="销售价" width="150" align="center">
          <template #default="scope">
            <el-input-number
              v-model="scope.row.salePrice"
              :precision="2"
              :min="0"
              :step="1"
              :controls-position="'right'"
              :disabled="!hasEditPerm"
              style="width: 100%"
              @change="markDirty(scope.row)"
            />
          </template>
        </el-table-column>
        <el-table-column label="单位毛利" width="100" align="center">
          <template #default="scope">
            <span :class="profit(scope.row) < 0 ? 'bp-value--danger' : ''">¥{{ money(profit(scope.row)) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="毛利率" width="100" align="center">
          <template #default="scope">
            <span :class="margin(scope.row) < 0 ? 'bp-value--danger' : ''">{{ margin(scope.row).toFixed(2) }}%</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90" align="center">
          <template #default="scope">
            <el-tag :type="scope.row.status === '0' ? 'success' : 'info'" size="small">
              {{ scope.row.status === '0' ? '在售' : '下架' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="变更" width="90" align="center">
          <template #default="scope">
            <el-tag v-if="isDirty(scope.row)" type="warning" size="small">已修改</el-tag>
            <span v-else class="bp-muted">—</span>
          </template>
        </el-table-column>
      </el-table>

      <div v-if="!tableLoading && viewRows.length === 0" class="bp-empty">
        <el-empty :description="currentBrand + ' 下暂无商品'" />
      </div>
    </div>

    <!-- ============ 批量调价弹窗 ============ -->
    <el-dialog title="批量调价" v-model="batchOpen" width="560px" append-to-body>
      <el-form :model="batch" label-width="96px">
        <el-form-item label="作用范围">
          <el-radio-group v-model="batch.scope">
            <el-radio value="all">本品牌全部（{{ rows.length }} 款）</el-radio>
            <el-radio value="selected">选中商品（{{ selected.length }} 款）</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="调整对象">
          <el-radio-group v-model="batch.target">
            <el-radio value="purchase">进货价</el-radio>
            <el-radio value="sale">销售价</el-radio>
            <el-radio value="both">进货价 + 销售价</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="调整方式">
          <el-radio-group v-model="batch.mode">
            <el-radio value="delta">固定金额增减</el-radio>
            <el-radio value="percent">百分比增减</el-radio>
            <el-radio value="fixed">统一设为</el-radio>
            <el-radio value="margin" :disabled="batch.target === 'purchase'">按毛利率定售价</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item :label="valueLabel">
          <el-input-number v-model="batch.value" :precision="2" :step="1" style="width: 200px" />
          <span class="bp-unit">{{ valueUnit }}</span>
          <div class="bp-hint">{{ valueHint }}</div>
        </el-form-item>
        <el-form-item label="预览">
          <div class="bp-preview">
            <div>影响商品：<b>{{ batchTargets.length }}</b> 款</div>
            <div v-if="previewSample" class="bp-preview__sample">
              示例：{{ previewSample.name }} —— {{ previewSample.fromText }} → <b>{{ previewSample.toText }}</b>
            </div>
            <div v-else class="bp-preview__sample bp-muted">请先选择作用范围与商品</div>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="applyBatch">确 定</el-button>
          <el-button @click="batchOpen = false">取 消</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="BeverageBrandPrice">
import { listBrandStats, listBrandProducts, updateBrandPrice } from "@/api/beverage/product"
import { useDict } from "@/utils/dict"
import useUserStore from "@/store/modules/user"

const { proxy } = getCurrentInstance()
const route = useRoute()

// 品牌字典（含尚未录入商品的品牌）
const { beverage_brand } = useDict('beverage_brand')
// 是否可改价：拥有 beverage:product:edit，或超管 *:*:*
const hasEditPerm = computed(() => {
  const perms = useUserStore().permissions || []
  return perms.some(p => p === '*:*:*' || p === 'beverage:product:edit')
})

/* ---------------- 品牌列表 ---------------- */
const view = ref('brand')            // 'brand' | 'price'
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
function money(val) {
  if (val == null) return '0.00'
  return Number(val).toFixed(2)
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
        minPurchase: 0, maxPurchase: 0,
        minSale: 0, maxSale: 0,
        avgMargin: 0
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

/* ---------------- 品牌价格表 ---------------- */
const currentBrand = ref('')
const rows = ref([])
const selected = ref([])
const onlyOnSale = ref(false)

const viewRows = computed(() => onlyOnSale.value ? rows.value.filter(r => r.status === '0') : rows.value)

function profit(row) {
  const p = Number(row.purchasePrice) || 0
  const s = Number(row.salePrice) || 0
  return s - p
}
function margin(row) {
  const s = Number(row.salePrice) || 0
  if (s <= 0) return 0
  return (s - (Number(row.purchasePrice) || 0)) / s * 100
}
function isDirty(row) {
  return Number(row.purchasePrice) !== Number(row._oPurchase) || Number(row.salePrice) !== Number(row._oSale)
}
function markDirty(row) { /* 输入即触发 computed，空实现仅为可读性 */ }

function openBrand(b) {
  currentBrand.value = b.brand
  view.value = 'price'
  loadProducts()
}
function backToBrands() {
  view.value = 'brand'
  currentBrand.value = ''
  rows.value = []
  selected.value = []
  loadBrands()
}
function loadProducts() {
  if (!currentBrand.value) return
  tableLoading.value = true
  listBrandProducts(currentBrand.value).then(res => {
    rows.value = (res.data || []).map(p => ({
      ...p,
      purchasePrice: Number(p.purchasePrice),
      salePrice: Number(p.salePrice),
      _oPurchase: Number(p.purchasePrice),
      _oSale: Number(p.salePrice)
    }))
    tableLoading.value = false
  }).catch(() => { tableLoading.value = false })
}

function handleSelectionChange(selection) {
  selected.value = selection
}

function submitPrice() {
  const changed = rows.value.filter(r => isDirty(r))
  if (changed.length === 0) {
    proxy.$modal.msgWarning('价格没有变化')
    return
  }
  const bad = changed.find(r => Number(r.salePrice) < 0 || Number(r.purchasePrice) < 0)
  if (bad) {
    proxy.$modal.msgError('价格不能为负数：' + bad.productName)
    return
  }
  const loss = changed.filter(r => Number(r.salePrice) < Number(r.purchasePrice))
  const tip = loss.length
    ? '其中 ' + loss.length + ' 款商品销售价低于进货价（将亏损），确认保存？'
    : '确认保存 ' + changed.length + ' 款商品的新价格？'
  proxy.$modal.confirm(tip).then(() => {
    return updateBrandPrice(changed.map(r => ({
      productId: r.productId,
      purchasePrice: r.purchasePrice,
      salePrice: r.salePrice
    })))
  }).then(() => {
    proxy.$modal.msgSuccess('已保存 ' + changed.length + ' 款商品的价格')
    loadProducts()
    loadBrands()
  }).catch(() => {})
}

/* ---------------- 批量调价 ---------------- */
const batchOpen = ref(false)
const batch = reactive({
  scope: 'all',
  target: 'sale',
  mode: 'percent',
  value: 5
})

const batchTargets = computed(() => batch.scope === 'selected' ? selected.value : rows.value)

const valueLabel = computed(() => {
  if (batch.mode === 'fixed') return '统一价格'
  if (batch.mode === 'margin') return '目标毛利率'
  return '调整幅度'
})
const valueUnit = computed(() => {
  if (batch.mode === 'fixed') return '元'
  if (batch.mode === 'margin') return '%'
  if (batch.mode === 'percent') return '%'
  return '元'
})
const valueHint = computed(() => {
  if (batch.mode === 'delta') return '正数为涨价，负数为降价'
  if (batch.mode === 'percent') return '例如 5 表示上浮 5%，-10 表示下调 10%'
  if (batch.mode === 'fixed') return '把价格直接设为该数值'
  return '按当前进货价反算销售价：售价 = 进货价 ÷ (1 − 毛利率%)'
})

// 「按毛利率定售价」只适用于销售价，切换调整对象时自动降级为百分比
watch(() => batch.target, (t) => {
  if (t === 'purchase' && batch.mode === 'margin') {
    batch.mode = 'percent'
  }
})

function calcNew(row, kind) {
  const oldVal = Number(kind === 'purchase' ? row.purchasePrice : row.salePrice) || 0
  const v = Number(batch.value) || 0
  let nv = oldVal
  if (batch.mode === 'delta') nv = oldVal + v
  else if (batch.mode === 'percent') nv = oldVal * (1 + v / 100)
  else if (batch.mode === 'fixed') nv = v
  else if (batch.mode === 'margin') {
    const p = Number(row.purchasePrice) || 0
    const rate = Math.min(Math.max(v, 0), 95) / 100
    nv = p > 0 ? p / (1 - rate) : 0
  }
  if (nv < 0) nv = 0
  return Number(nv.toFixed(2))
}

const previewSample = computed(() => {
  const list = batchTargets.value
  if (!list || list.length === 0) return null
  const row = list[0]
  const parts = []
  const showPurchase = batch.mode !== 'margin' && batch.target !== 'sale'
  const showSale = batch.mode === 'margin' || batch.target !== 'purchase'
  if (showPurchase) {
    parts.push('进 ¥' + money(row.purchasePrice) + ' → ¥' + money(calcNew(row, 'purchase')))
  }
  if (showSale) {
    parts.push('售 ¥' + money(row.salePrice) + ' → ¥' + money(calcNew(row, 'sale')))
  }
  return { name: row.productName, fromText: '', toText: parts.join('，') }
})

function openBatch() {
  if (rows.value.length === 0) {
    proxy.$modal.msgWarning('当前品牌没有商品')
    return
  }
  batch.scope = selected.value.length ? 'selected' : 'all'
  batchOpen.value = true
}
function applyBatch() {
  const list = batchTargets.value
  if (!list || list.length === 0) {
    proxy.$modal.msgWarning('没有可调整的商品')
    return
  }
  list.forEach(row => {
    if (batch.mode === 'margin') {
      row.salePrice = calcNew(row, 'sale')
    } else if (batch.target === 'purchase') {
      row.purchasePrice = calcNew(row, 'purchase')
    } else if (batch.target === 'sale') {
      row.salePrice = calcNew(row, 'sale')
    } else {
      row.purchasePrice = calcNew(row, 'purchase')
      row.salePrice = calcNew(row, 'sale')
    }
  })
  batchOpen.value = false
  proxy.$modal.msgSuccess('已调整 ' + list.length + ' 款商品，确认无误后点「保存」')
}

onMounted(() => {
  loadBrands()
  const b = route.query.brand
  if (b) {
    currentBrand.value = String(b)
    view.value = 'price'
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
  .bp-unit { margin-left: 8px; color: var(--el-text-color-secondary); }
  .bp-hint { font-size: 12px; color: var(--el-text-color-secondary); line-height: 1.5; margin-top: 2px; }
  .bp-preview { font-size: 13px; line-height: 1.8; }
  .bp-preview__sample { color: var(--el-text-color-regular); }
}
</style>
